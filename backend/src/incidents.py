# incidents.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import datetime
from datetime import timedelta

# FIXED IMPORTS
from src.db import incidents_coll
from src.ml_model import predict_category

router = APIRouter()

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
        "Clean Category": category,
        "Latitude": payload.latitude,
        "Longitude": payload.longitude,
        "location": {
            "type": "Point",
            "coordinates": [payload.longitude, payload.latitude]
        },
        "Victim Age": payload.victim_age,
        "Victim Gender": payload.victim_gender,
        "Weapon Used": payload.weapon_used,
        "Reported At": datetime.datetime.utcnow()
    }

    res = await incidents_coll.insert_one(doc)
    return {
        "inserted_id": str(res.inserted_id),
        "predicted_category": category
    }

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
    types: Optional[str] = Query(None, description="Comma separated list of crime types / categories"),
    time_range: Optional[str] = Query(None, description="Time range filter: 24h, 7d, 30d, etc."),
    severity_min: Optional[float] = Query(None, description="Minimum severity value")
):
    # Build mongo query from optional filters
    query = {}

    if types:
        # Accept comma-separated categories
        cats = [t.strip() for t in types.split(",") if t.strip()]
        if cats:
            query["Clean Category"] = {"$in": cats}

    if time_range:
        now = datetime.datetime.utcnow()
        try:
            if time_range.endswith("h"):
                hours = int(time_range[:-1])
                since = now - timedelta(hours=hours)
            elif time_range.endswith("d"):
                days = int(time_range[:-1])
                since = now - timedelta(days=days)
            else:
                # fallback to days parse
                days = int(time_range)
                since = now - timedelta(days=days)

            query["Reported At"] = {"$gte": since}
        except Exception:
            # ignore malformed time_range
            pass

    if severity_min is not None:
        try:
            query["Severity"] = {"$gte": float(severity_min)}
        except Exception:
            pass

    projection = {"Latitude": 1, "Longitude": 1, "Severity": 1, "Reported At": 1, "Clean Category": 1}
    cursor = incidents_coll.find(query, projection)

    points = []
    async for d in cursor:
        lat = d.get("Latitude")
        lon = d.get("Longitude")
        sev = d.get("Severity", 1)
        if lat is None or lon is None:
            continue
        points.append([lat, lon, sev])

    return {"heatmap": points}
