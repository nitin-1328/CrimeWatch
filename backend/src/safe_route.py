# safe_route.py
from fastapi import APIRouter, HTTPException
import requests
from shapely.geometry import LineString
from src.db import incidents_coll
import math

router = APIRouter()

OSRM_URL = (
    "http://router.project-osrm.org/route/v1/driving/"
    "{start_lon},{start_lat};{end_lon},{end_lat}"
    "?overview=full&alternatives=true&geometries=geojson"
)

def meters_to_radians(meters):
    return meters / 6371000.0  # Earth radius meters → radians

async def compute_route_score(geometry):
    coords = geometry["coordinates"]
    line = LineString(coords)

    # Sample 25 points on route for accuracy
    points = [line.interpolate(i / 25, normalized=True) for i in range(26)]
    total_score = 0

    for pt in points:
        lon, lat = pt.x, pt.y

        # FIXED --- using geoWithin + centerSphere (NO nearSphere)
        radius_radians = meters_to_radians(250)  # 250m radius

        count = await incidents_coll.count_documents({
            "location": {
                "$geoWithin": {
                    "$centerSphere": [[lon, lat], radius_radians]
                }
            }
        })

        total_score += count

    return total_score

@router.get("/find")
async def find_safe_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float):
    url = OSRM_URL.format(
        start_lon=start_lon,
        start_lat=start_lat,
        end_lon=end_lon,
        end_lat=end_lat
    )

    try:
        r = requests.get(url, timeout=10)
    except:
        raise HTTPException(status_code=500, detail="Could not reach OSRM routing API")

    if r.status_code != 200:
        raise HTTPException(status_code=500, detail="Routing API failed")

    data = r.json()
    routes = data.get("routes", [])

    if not routes:
        raise HTTPException(status_code=404, detail="No route found")

    scored_routes = []

    for route in routes:
        geometry = route.get("geometry")

        score = await compute_route_score(geometry)

        scored_routes.append({
            "score": score,
            "geometry": geometry,
            "distance": route.get("distance"),
            "duration": route.get("duration")
        })

    best = min(scored_routes, key=lambda x: x["score"])
    return best
