# safe_route.py
from fastapi import APIRouter, HTTPException, Query
from shapely.geometry import LineString
from src.db import incidents_coll
import httpx
import asyncio
import math

router = APIRouter()

# ── OSRM public API ────────────────────────────────
OSRM_URL = (
    "http://router.project-osrm.org/route/v1/driving/"
    "{start_lon},{start_lat};{end_lon},{end_lat}"
    "?overview=full&alternatives=true&geometries=geojson"
)

# ── Simple in-memory cache ─────────────────────────
# Key: (start_lat, start_lon, end_lat, end_lon)
_route_cache: dict = {}

def _cache_key(start_lat, start_lon, end_lat, end_lon):
    # Round to 4 decimal places (~11m precision) for cache hits
    return (
        round(start_lat, 4), round(start_lon, 4),
        round(end_lat,   4), round(end_lon,   4),
    )

def meters_to_radians(meters: float) -> float:
    return meters / 6_371_000.0


# ── Score a single route geometry ─────────────────
async def compute_route_score(geometry: dict, samples: int = 20) -> int:
    coords = geometry.get("coordinates", [])
    if len(coords) < 2:
        return 0

    line   = LineString(coords)
    radius = meters_to_radians(300)   # 300m radius around each sample point

    # Sample N evenly-spaced points along route
    sample_points = [
        line.interpolate(i / samples, normalized=True)
        for i in range(samples + 1)
    ]

    # Run all DB queries concurrently for speed
    async def count_near(pt):
        try:
            return await incidents_coll.count_documents({
                "location": {
                    "$geoWithin": {
                        "$centerSphere": [[pt.x, pt.y], radius]
                    }
                }
            })
        except Exception:
            return 0

    counts = await asyncio.gather(*[count_near(pt) for pt in sample_points])
    return int(sum(counts))


# ── Haversine fallback (straight line distance) ───
def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R    = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a    = (math.sin(dlat / 2) ** 2 +
            math.cos(math.radians(lat1)) *
            math.cos(math.radians(lat2)) *
            math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Main endpoint ──────────────────────────────────
@router.get("/find")
async def find_safe_route(
    start_lat: float = Query(..., description="Start latitude"),
    start_lon: float = Query(..., description="Start longitude"),
    end_lat:   float = Query(..., description="End latitude"),
    end_lon:   float = Query(..., description="End longitude"),
):
    # ── Validate coordinates ───────────────────────
    for val, name in [
        (start_lat, "start_lat"), (start_lon, "start_lon"),
        (end_lat,   "end_lat"),   (end_lon,   "end_lon"),
    ]:
        if not (-90 <= val <= 90 if "lat" in name else -180 <= val <= 180):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid coordinate: {name}={val}"
            )

    # ── Check cache ────────────────────────────────
    key = _cache_key(start_lat, start_lon, end_lat, end_lon)
    if key in _route_cache:
        return _route_cache[key]

    # ── Call OSRM ──────────────────────────────────
    url = OSRM_URL.format(
        start_lon=start_lon, start_lat=start_lat,
        end_lon=end_lon,     end_lat=end_lat,
    )

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(url)
        r.raise_for_status()
        data = r.json()
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Routing API timed out. Please try again."
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Routing API error: {e.response.status_code}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not reach routing API: {str(e)}"
        )

    routes = data.get("routes", [])
    if not routes:
        raise HTTPException(status_code=404, detail="No route found between these locations.")

    # ── Score all routes concurrently ─────────────
    async def score_route(route):
        geometry = route.get("geometry", {})
        score    = await compute_route_score(geometry)
        dist_km  = haversine_km(start_lat, start_lon, end_lat, end_lon)
        return {
            "score":    score,
            "geometry": geometry,
            "distance": route.get("distance"),   # meters (from OSRM)
            "duration": route.get("duration"),   # seconds (from OSRM)
            "distance_km": round(dist_km, 2),
        }

    scored = await asyncio.gather(*[score_route(r) for r in routes])

    # ── Pick safest (lowest score) route ──────────
    best = min(scored, key=lambda x: x["score"])

    # ── Cache result ───────────────────────────────
    _route_cache[key] = best

    return best
