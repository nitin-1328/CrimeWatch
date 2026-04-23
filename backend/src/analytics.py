# analytics.py
import pandas as pd
from fastapi import APIRouter, Query
from sklearn.linear_model import LinearRegression
import numpy as np
import os
from typing import Optional

router = APIRouter()

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
DATA_PATH = os.path.join(BASE, "cleaned_crime_dataset.csv")

# Load + prep once at startup
df = pd.read_csv(DATA_PATH)
df["Date Reported"] = pd.to_datetime(df["Date Reported"], errors="coerce")
df = df.dropna(subset=["Date Reported"])
df["year_month"] = df["Date Reported"].dt.to_period("M").astype(str)
df["day_of_week"] = df["Date Reported"].dt.day_name()
df["hour"] = df["Date Reported"].dt.hour
df["Severity"] = pd.to_numeric(df["Severity"], errors="coerce").fillna(1)
df["Weapon Used"] = df["Weapon Used"].fillna("None")

_order = ["Morning", "Afternoon", "Evening", "Night"]
_day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
_nearby_severity_levels = [1, 2, 3, 4, 5]
_nearby_area_columns = ["Locality", "Area", "Sector", "District", "Sub-District", "Police Station"]
_earth_radius_km = 6371.0088


if "Latitude" in df.columns:
    df["Latitude"] = pd.to_numeric(df["Latitude"], errors="coerce")
else:
    df["Latitude"] = np.nan

if "Longitude" in df.columns:
    df["Longitude"] = pd.to_numeric(df["Longitude"], errors="coerce")
else:
    df["Longitude"] = np.nan

if "Lat_Round" in df.columns:
    df["Lat_Round"] = pd.to_numeric(df["Lat_Round"], errors="coerce")
else:
    df["Lat_Round"] = np.nan

if "Lon_Round" in df.columns:
    df["Lon_Round"] = pd.to_numeric(df["Lon_Round"], errors="coerce")
else:
    df["Lon_Round"] = np.nan


def _time_period_from_hour(h):
    if 6 <= h < 12:
        return "Morning"
    if 12 <= h < 17:
        return "Afternoon"
    if 17 <= h < 21:
        return "Evening"
    return "Night"


def _haversine_km(origin_lat: float, origin_lon: float, latitudes: np.ndarray, longitudes: np.ndarray) -> np.ndarray:
    """Vectorized Haversine distance (km) from one point to many points."""
    lat1 = np.radians(origin_lat)
    lon1 = np.radians(origin_lon)
    lat2 = np.radians(latitudes)
    lon2 = np.radians(longitudes)

    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    return 2.0 * _earth_radius_km * np.arcsin(np.sqrt(a))


def _build_nearby_area_labels(source: pd.DataFrame) -> pd.Series:
    """Pick the most local available area label, falling back to coordinate sector buckets."""
    for col in _nearby_area_columns:
        if col in source.columns:
            labels = source[col].fillna("").astype(str).str.strip()
            if (labels != "").any():
                return labels.where(labels != "", "Unknown area")

    city = source["City"].fillna("Nearby area").astype(str).str.strip()
    lat_round = pd.to_numeric(source.get("Lat_Round"), errors="coerce")
    lon_round = pd.to_numeric(source.get("Lon_Round"), errors="coerce")
    if lat_round.notna().any() and lon_round.notna().any():
        lat_text = lat_round.map(lambda v: f"{v:.2f}" if pd.notna(v) else "?")
        lon_text = lon_round.map(lambda v: f"{v:.2f}" if pd.notna(v) else "?")
        return city + " sector " + lat_text + "," + lon_text

    return city.where(city != "", "Nearby area")


if "Crime_Time_Period" not in df.columns:
    df["Crime_Time_Period"] = df["hour"].apply(_time_period_from_hour)


# Globals filled by _rebuild_cache()
_monthly_cache = {}
_top_cities_cache = {}
_category_cache = {}
_time_cache = {}
_day_cache = {}
_severity_cache = {}
_closure_cache = {}
_weapon_cache = {}
_all_cities = []
_all_weapons = []
_all_categories = []


def _rebuild_cache():
    global _monthly_cache, _top_cities_cache, _category_cache, _time_cache
    global _day_cache, _severity_cache, _closure_cache, _weapon_cache
    global _all_cities, _all_weapons, _all_categories

    print("[analytics] Pre-computing analytics cache...")

    _monthly = df.groupby("year_month").size().reset_index(name="count")
    _X = np.arange(len(_monthly)).reshape(-1, 1)
    _y = _monthly["count"].values
    _model = LinearRegression().fit(_X, _y)

    _future_steps = 3
    _X_future = np.arange(len(_monthly), len(_monthly) + _future_steps).reshape(-1, 1)
    _y_future = _model.predict(_X_future).tolist()
    _last_date = pd.to_datetime(_monthly["year_month"].iloc[-1] + "-01")
    _future_months = [
        (_last_date + pd.DateOffset(months=i)).strftime("%Y-%m")
        for i in range(1, _future_steps + 1)
    ]

    _monthly_cache = {
        "historical": {"labels": _monthly["year_month"].tolist(), "values": _monthly["count"].tolist()},
        "forecast": {"labels": _future_months, "values": _y_future},
    }

    _city = (
        df.groupby("City")
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
        .head(10)
    )
    _top_cities_cache = {"labels": _city["City"].tolist(), "values": _city["count"].tolist()}

    _cat = (
        df.groupby("Clean Category")
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )
    _category_cache = {"labels": _cat["Clean Category"].tolist(), "values": _cat["count"].tolist()}

    _time = df.groupby("Crime_Time_Period").size().reset_index(name="count")
    _time["sort"] = _time["Crime_Time_Period"].map({v: i for i, v in enumerate(_order)})
    _time = _time.sort_values("sort")
    _time_cache = {"labels": _time["Crime_Time_Period"].tolist(), "values": _time["count"].tolist()}

    _day = df.groupby("day_of_week").size().reset_index(name="count")
    _day["sort"] = _day["day_of_week"].map({v: i for i, v in enumerate(_day_order)})
    _day = _day.sort_values("sort")
    _day_cache = {"labels": _day["day_of_week"].tolist(), "values": _day["count"].tolist()}

    _sev = df.groupby("Severity").size().reset_index(name="count").sort_values("Severity")
    _severity_cache = {
        "labels": [f"Level {int(s)}" for s in _sev["Severity"].tolist()],
        "values": _sev["count"].tolist(),
    }

    if "Case Closed" in df.columns:
        _closure = (
            df.groupby("City")
            .apply(lambda x: round((x["Case Closed"] == "Yes").sum() / len(x) * 100, 1))
            .reset_index(name="rate")
            .sort_values("rate", ascending=False)
            .head(10)
        )
        _closure_cache = {"labels": _closure["City"].tolist(), "values": _closure["rate"].tolist()}
    else:
        _closure_cache = {"labels": [], "values": []}

    _weapon = (
        df.groupby("Weapon Used")
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )
    _weapon_cache = {"labels": _weapon["Weapon Used"].tolist(), "values": _weapon["count"].tolist()}

    _all_cities = sorted(df["City"].dropna().unique().tolist())
    _all_weapons = sorted(df["Weapon Used"].dropna().unique().tolist())
    _all_categories = sorted(df["Clean Category"].dropna().unique().tolist())

    print(f"[analytics] Cache ready - {len(df):,} records, {len(_all_cities)} cities")


def add_runtime_incident(incident: dict):
    """
    Add a freshly reported incident to analytics runtime dataframe/cache.
    Keeps analytics endpoints updated without app restart.
    """
    global df

    reported_at = pd.to_datetime(
        incident.get("Reported At") or incident.get("Date Reported"),
        errors="coerce",
    )
    if pd.isna(reported_at):
        reported_at = pd.Timestamp.utcnow()

    severity = pd.to_numeric([incident.get("Severity", 1)], errors="coerce")[0]
    if pd.isna(severity):
        severity = 1

    latitude = pd.to_numeric([incident.get("Latitude")], errors="coerce")[0]
    longitude = pd.to_numeric([incident.get("Longitude")], errors="coerce")[0]

    hour = int(reported_at.hour)
    row = {
        "Date Reported": reported_at,
        "year_month": str(reported_at.to_period("M")),
        "day_of_week": reported_at.day_name(),
        "hour": hour,
        "Severity": float(severity),
        "Weapon Used": incident.get("Weapon Used") or "None",
        "Crime_Time_Period": incident.get("Crime_Time_Period") or _time_period_from_hour(hour),
        "City": incident.get("City") if incident.get("City") else np.nan,
        "Clean Category": incident.get("Clean Category") or "Other",
        "Latitude": latitude,
        "Longitude": longitude,
        "Lat_Round": round(float(latitude), 2) if pd.notna(latitude) else np.nan,
        "Lon_Round": round(float(longitude), 2) if pd.notna(longitude) else np.nan,
    }
    if "Case Closed" in df.columns:
        row["Case Closed"] = incident.get("Case Closed", "No")

    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    _rebuild_cache()


_rebuild_cache()


# Routes
@router.get("/monthly_trend")
def monthly_trend():
    return _monthly_cache


@router.get("/top_cities")
def top_cities():
    return _top_cities_cache


@router.get("/category_stats")
def category_stats():
    return _category_cache


@router.get("/time_stats")
def time_stats():
    return _time_cache


@router.get("/day_stats")
def day_stats():
    return _day_cache


@router.get("/severity_stats")
def severity_stats():
    return _severity_cache


@router.get("/closure_rate")
def closure_rate():
    return _closure_cache


@router.get("/weapon_stats")
def weapon_stats():
    return _weapon_cache


@router.get("/filters")
def get_filters():
    """Returns available filter options for the frontend."""
    return {
        "cities": _all_cities,
        "weapons": _all_weapons,
        "categories": _all_categories,
    }


@router.get("/compare_cities")
def compare_cities(cities: str = Query(...)):
    """
    Compare multiple cities across crime categories, severity, time of day.
    cities = comma-separated e.g. "Delhi,Mumbai,Bangalore"
    """
    city_list = [c.strip() for c in cities.split(",") if c.strip()]
    if not city_list:
        return {"error": "No cities provided"}

    result = {}
    for city in city_list:
        city_df = df[df["City"] == city]
        if city_df.empty:
            continue

        cat = city_df.groupby("Clean Category").size().reset_index(name="count").sort_values("count", ascending=False)
        sev = city_df.groupby("Severity").size().reset_index(name="count").sort_values("Severity")

        time_s = city_df.groupby("Crime_Time_Period").size().reset_index(name="count")
        time_s["sort"] = time_s["Crime_Time_Period"].map({v: i for i, v in enumerate(_order)})
        time_s = time_s.sort_values("sort")

        top_weapon = city_df["Weapon Used"].value_counts().head(1)
        monthly = city_df.groupby("year_month").size().reset_index(name="count")

        result[city] = {
            "total": len(city_df),
            "categories": {"labels": cat["Clean Category"].tolist(), "values": cat["count"].tolist()},
            "severity": {"labels": [f"Level {int(s)}" for s in sev["Severity"].tolist()], "values": sev["count"].tolist()},
            "time_of_day": {"labels": time_s["Crime_Time_Period"].tolist(), "values": time_s["count"].tolist()},
            "top_weapon": top_weapon.index[0] if len(top_weapon) else "Unknown",
            "monthly": {"labels": monthly["year_month"].tolist(), "values": monthly["count"].tolist()},
            "avg_severity": round(float(city_df["Severity"].mean()), 2),
            "closure_rate": round((city_df["Case Closed"] == "Yes").mean() * 100, 1) if "Case Closed" in city_df.columns else 0,
        }

    return result


@router.get("/weapon_analysis")
def weapon_analysis(weapon: Optional[str] = Query(None), city: Optional[str] = Query(None)):
    """
    Detailed analysis for a specific weapon - which crime categories,
    cities, times, and severity levels it appears in most.
    """
    filtered = df.copy()
    if weapon:
        filtered = filtered[filtered["Weapon Used"] == weapon]
    if city:
        filtered = filtered[filtered["City"] == city]

    if filtered.empty:
        return {"error": "No data for this filter"}

    cat = filtered.groupby("Clean Category").size().reset_index(name="count").sort_values("count", ascending=False)
    city_cnt = filtered.groupby("City").size().reset_index(name="count").sort_values("count", ascending=False).head(10)

    time_s = filtered.groupby("Crime_Time_Period").size().reset_index(name="count")
    time_s["sort"] = time_s["Crime_Time_Period"].map({v: i for i, v in enumerate(_order)})
    time_s = time_s.sort_values("sort")

    sev = filtered.groupby("Severity").size().reset_index(name="count").sort_values("Severity")

    day_s = filtered.groupby("day_of_week").size().reset_index(name="count")
    day_s["sort"] = day_s["day_of_week"].map({v: i for i, v in enumerate(_day_order)})
    day_s = day_s.sort_values("sort")

    return {
        "total": len(filtered),
        "weapon": weapon or "All",
        "city": city or "All",
        "categories": {"labels": cat["Clean Category"].tolist(), "values": cat["count"].tolist()},
        "cities": {"labels": city_cnt["City"].tolist(), "values": city_cnt["count"].tolist()},
        "time_of_day": {"labels": time_s["Crime_Time_Period"].tolist(), "values": time_s["count"].tolist()},
        "severity": {"labels": [f"Level {int(s)}" for s in sev["Severity"].tolist()], "values": sev["count"].tolist()},
        "day_of_week": {"labels": day_s["day_of_week"].tolist(), "values": day_s["count"].tolist()},
        "avg_severity": round(float(filtered["Severity"].mean()), 2),
    }


@router.get("/dashboard_nearby")
def dashboard_nearby(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(10.0, gt=0, le=100),
):
    """Dashboard-only nearby summary: stats, nearby alerts, and nearby area snapshot."""
    geo = df.dropna(subset=["Latitude", "Longitude"]).copy()
    if geo.empty:
        return {
            "meta": {"total_records": 0, "high_risk_zones": 0, "medium_risk_zones": 0, "low_risk_zones": 0},
            "severity_stats": {"labels": [f"Level {s}" for s in _nearby_severity_levels], "values": [0] * len(_nearby_severity_levels)},
            "top_nearby_areas": {"labels": [], "values": []},
            "alerts": [],
            "radius_km": radius_km,
        }

    distances = _haversine_km(
        origin_lat=lat,
        origin_lon=lon,
        latitudes=geo["Latitude"].to_numpy(dtype=float),
        longitudes=geo["Longitude"].to_numpy(dtype=float),
    )
    nearby_mask = distances <= radius_km
    nearby = geo.loc[nearby_mask].copy()

    if nearby.empty:
        return {
            "meta": {"total_records": 0, "high_risk_zones": 0, "medium_risk_zones": 0, "low_risk_zones": 0},
            "severity_stats": {"labels": [f"Level {s}" for s in _nearby_severity_levels], "values": [0] * len(_nearby_severity_levels)},
            "top_nearby_areas": {"labels": [], "values": []},
            "alerts": [],
            "radius_km": radius_km,
        }

    nearby["distance_km"] = distances[nearby_mask]
    nearby["nearby_area"] = _build_nearby_area_labels(nearby)
    nearby["Severity"] = pd.to_numeric(nearby["Severity"], errors="coerce").fillna(1)

    severity_levels = nearby["Severity"].round().astype(int).clip(1, 5)
    severity_counts = severity_levels.value_counts()
    severity_values = [int(severity_counts.get(level, 0)) for level in _nearby_severity_levels]

    area_counts = nearby["nearby_area"].value_counts().head(5)

    top_alerts = nearby.sort_values(
        by=["Severity", "Date Reported", "distance_km"],
        ascending=[False, False, True],
    ).head(3)
    alerts = []
    for _, row in top_alerts.iterrows():
        severity = float(row.get("Severity", 1))
        if severity >= 4:
            level = "high"
            text = "High activity reported"
        elif severity >= 3:
            level = "medium"
            text = "Medium risk activity reported"
        else:
            level = "low"
            text = "Low risk activity reported"

        area_name = str(row.get("nearby_area") or row.get("City") or "nearby area")
        distance_km = round(float(row.get("distance_km", 0.0)), 2)
        alerts.append(
            {
                "level": level,
                "distance_km": distance_km,
                "text": f"{text} in {area_name} - {distance_km:.1f} km away",
            }
        )

    return {
        "meta": {
            "total_records": int(len(nearby)),
            "high_risk_zones": int((nearby["Severity"] >= 4).sum()),
            "medium_risk_zones": int((nearby["Severity"] == 3).sum()),
            "low_risk_zones": int((nearby["Severity"] < 3).sum()),
        },
        "severity_stats": {"labels": [f"Level {s}" for s in _nearby_severity_levels], "values": severity_values},
        "top_nearby_areas": {"labels": area_counts.index.tolist(), "values": area_counts.tolist()},
        "alerts": alerts,
        "radius_km": radius_km,
    }


@router.get("/summary")
def summary():
    sev_vals = _severity_cache["values"]
    return {
        "monthly_trend": _monthly_cache,
        "top_cities": _top_cities_cache,
        "category_stats": _category_cache,
        "time_stats": _time_cache,
        "day_stats": _day_cache,
        "severity_stats": _severity_cache,
        "closure_rate": _closure_cache,
        "weapon_stats": _weapon_cache,
        "meta": {
            "total_records": len(df),
            "cities_covered": int(df["City"].nunique()),
            "high_risk_zones": int((df["Severity"] >= 4).sum()),
            "case_closure_rate": round((df["Case Closed"] == "Yes").mean() * 100, 1) if "Case Closed" in df.columns else 0,
        },
    }
