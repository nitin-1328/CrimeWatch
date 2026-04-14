# incidents.py
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import datetime
from datetime import timedelta
import pandas as pd
import numpy as np
import os

from src.db import incidents_coll
from src.ml_model import predict_category

router = APIRouter()

BASE      = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
DATA_PATH = os.path.join(BASE, "cleaned_crime_dataset.csv")

try:
    _df = pd.read_csv(DATA_PATH)
    _df['Date Reported'] = pd.to_datetime(_df['Date Reported'], errors='coerce')
    _df = _df.dropna(subset=['Latitude', 'Longitude'])
    _df = _df[pd.to_numeric(_df['Latitude'],  errors='coerce').notna()]
    _df = _df[pd.to_numeric(_df['Longitude'], errors='coerce').notna()]
    _df['Latitude']  = _df['Latitude'].astype(float)
    _df['Longitude'] = _df['Longitude'].astype(float)
    _df['Severity']  = pd.to_numeric(_df['Severity'], errors='coerce').fillna(1)
    _df['Weapon Used'] = _df['Weapon Used'].fillna('None')
    print(f"[incidents] Loaded {len(_df)} valid rows from CSV")

    # ── Pre-build heatmap cache at startup ────────
    # For heatmap: only need lat, lon, weight, category, date, severity, city, time_period
    _heatmap_cols = ['Latitude', 'Longitude', 'Severity', 'Clean Category',
                     'Date Reported', 'City', 'Crime_Time_Period']
    _heatmap_df = _df[_heatmap_cols].copy()

    # Smart sample with hard cap: prioritize high severity, then medium, then low
    _high   = _heatmap_df[_heatmap_df['Severity'] >= 4]
    _medium = _heatmap_df[_heatmap_df['Severity'] == 3]
    _low    = _heatmap_df[_heatmap_df['Severity'] < 3]

    MAX_POINTS = 40000  # frontend handles this well
    n_high_all = len(_high)
    if n_high_all >= MAX_POINTS:
        n_high, n_medium, n_low = MAX_POINTS, 0, 0
        _sampled = _high.sample(n=n_high, random_state=42).reset_index(drop=True)
    else:
        n_high = n_high_all
        remaining = MAX_POINTS - n_high
        n_medium = min(len(_medium), int(MAX_POINTS * 0.35), remaining)
        remaining -= n_medium
        n_low = min(len(_low), remaining)

        _sampled = pd.concat([
            _high,
            _medium.sample(n=n_medium, random_state=42) if n_medium > 0 else pd.DataFrame(),
            _low.sample(n=n_low, random_state=42) if n_low > 0 else pd.DataFrame(),
        ]).reset_index(drop=True)

    # Pre-convert to list for fast serialization
    _heatmap_cache = []
    for _, row in _sampled.iterrows():
        sev    = float(row['Severity'])
        weight = round(min(max(sev / 5.0, 0.1), 1.0), 2)
        dt_str = row['Date Reported'].isoformat() if pd.notna(row['Date Reported']) else None
        _heatmap_cache.append([
            round(float(row['Latitude']),  6),
            round(float(row['Longitude']), 6),
            weight,
            str(row.get('Clean Category', 'Other')),
            dt_str,
            int(sev),
            str(row.get('City', '')),
            str(row.get('Crime_Time_Period', '')),
        ])

    print(f"[incidents] Heatmap cache: {len(_heatmap_cache)} points "
          f"(high={n_high}, med={n_medium}, low={n_low})")

except Exception as e:
    print(f"[incidents] WARNING: Could not load CSV: {e}")
    _df = pd.DataFrame()
    _heatmap_cache = []


def _time_period_from_hour(hour: int) -> str:
    if 6 <= hour < 12:
        return "Morning"
    if 12 <= hour < 17:
        return "Afternoon"
    if 17 <= hour < 21:
        return "Evening"
    return "Night"


def _append_runtime_incident(doc: dict):
    """
    Keep in-memory dataframe/cache in sync with newly reported incidents.
    This makes report updates visible without restarting the backend.
    """
    global _df, _heatmap_cache

    lat = pd.to_numeric([doc.get("Latitude")], errors="coerce")[0]
    lon = pd.to_numeric([doc.get("Longitude")], errors="coerce")[0]
    if pd.isna(lat) or pd.isna(lon):
        return

    severity = pd.to_numeric([doc.get("Severity", 1)], errors="coerce")[0]
    if pd.isna(severity):
        severity = 1

    reported_at = pd.to_datetime(
        doc.get("Reported At") or doc.get("Date Reported"),
        errors="coerce",
    )
    if pd.isna(reported_at):
        reported_at = pd.Timestamp.utcnow()

    hour = int(reported_at.hour)
    city = doc.get("City")
    crime_time_period = doc.get("Crime_Time_Period") or _time_period_from_hour(hour)
    weapon = doc.get("Weapon Used") or "None"
    category = doc.get("Clean Category") or "Other"

    new_row = {
        "Latitude": float(lat),
        "Longitude": float(lon),
        "Severity": float(severity),
        "Clean Category": category,
        "Date Reported": reported_at,
        "City": city if city else np.nan,
        "Crime_Time_Period": crime_time_period,
        "Weapon Used": weapon,
    }
    _df = pd.concat([_df, pd.DataFrame([new_row])], ignore_index=True)

    weight = round(min(max(float(severity) / 5.0, 0.1), 1.0), 2)
    _heatmap_cache.append([
        round(float(lat), 6),
        round(float(lon), 6),
        weight,
        str(category),
        reported_at.isoformat(),
        int(float(severity)),
        str(city or ""),
        str(crime_time_period),
    ])


class ReportIn(BaseModel):
    description: str
    latitude: float
    longitude: float
    victim_age: Optional[int] = None
    victim_gender: Optional[str] = None
    weapon_used: Optional[str] = None


@router.post("/report")
async def report_incident(payload: ReportIn):
    try:
        category = predict_category(payload.description)
    except Exception:
        category = "Other"
    doc = {
        "Crime Description": payload.description,
        "Clean Category":    category,
        "Latitude":          payload.latitude,
        "Longitude":         payload.longitude,
        "location": {"type": "Point", "coordinates": [payload.longitude, payload.latitude]},
        "Victim Age":    payload.victim_age,
        "Victim Gender": payload.victim_gender,
        "Weapon Used":   payload.weapon_used,
        "Severity":      3,
        "Reported At":   datetime.datetime.utcnow()
    }
    res = await incidents_coll.insert_one(doc)

    _append_runtime_incident(doc)

    # Keep analytics module cache in sync if available.
    try:
        from src import analytics as analytics_module
        analytics_module.add_runtime_incident(doc)
    except Exception as e:
        print(f"[incidents] analytics runtime sync skipped: {e}")

    # Clear cached route scores so newly reported incidents affect repeated route queries.
    try:
        from src import safe_route as safe_route_module
        safe_route_module._route_cache.clear()
    except Exception:
        pass

    return {"inserted_id": str(res.inserted_id), "predicted_category": category}


@router.get("/list")
async def list_incidents(limit: int = 200):
    cursor = incidents_coll.find().sort("Reported At", -1).limit(limit)
    results = []
    async for d in cursor:
        d["_id"] = str(d["_id"])
        results.append(d)
    return results


@router.get("/heatmap")
async def heatmap(
    types:        Optional[str]   = Query(None),
    time_range:   Optional[str]   = Query(None),
    severity_min: Optional[float] = Query(None),
):
    """Fast heatmap using pre-built cache. Filters applied client-side for speed."""

    # If no filters → return full cache instantly
    if not types and not severity_min and not time_range:
        return {"heatmap": _heatmap_cache}

    # Apply filters on cache
    points = _heatmap_cache

    if types:
        cats = {t.strip() for t in types.split(",") if t.strip()}
        points = [p for p in points if p[3] in cats]

    if severity_min is not None:
        min_weight = float(severity_min) / 5.0
        points = [p for p in points if p[2] >= min_weight]

    if time_range and time_range not in ("all", "7d"):
        try:
            now = datetime.datetime.utcnow()
            if time_range.endswith("h"):
                since = now - timedelta(hours=int(time_range[:-1]))
            elif time_range.endswith("d"):
                since = now - timedelta(days=int(time_range[:-1]))
            else:
                since = now - timedelta(days=int(time_range))
            points = [p for p in points if p[4] and datetime.datetime.fromisoformat(p[4]) >= since]
        except Exception:
            pass

    return {"heatmap": points}


@router.get("/stats")
async def stats():
    """Quick stats from full dataset."""
    if _df.empty:
        return {}
    return {
        "total": len(_df),
        "high_risk": int((_df['Severity'] >= 4).sum()),
        "medium_risk": int((_df['Severity'] == 3).sum()),
        "low_risk": int((_df['Severity'] < 3).sum()),
        "cities": int(_df['City'].nunique()),
        "categories": _df['Clean Category'].value_counts().to_dict(),
    }
