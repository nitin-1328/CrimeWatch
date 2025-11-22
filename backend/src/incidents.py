# incidents.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import datetime

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
async def heatmap():
    cursor = incidents_coll.find({}, {"Latitude": 1, "Longitude": 1, "Severity": 1})
    points = []
    async for d in cursor:
        lat = d.get("Latitude")
        lon = d.get("Longitude")
        sev = d.get("Severity", 1)
        if lat and lon:
            points.append([lat, lon, sev])
    return {"heatmap": points}
