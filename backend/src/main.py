# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="CrimeWatch API")

origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ── Routers ────────────────────────────────────────
from src.incidents  import router as incidents_router
from src.auth       import router as auth_router
from src.safe_route import router as safe_router
from src.analytics  import router as analytics_router

app.include_router(auth_router,       prefix="/auth")
app.include_router(incidents_router,  prefix="/incidents")
app.include_router(safe_router,       prefix="/route")
app.include_router(analytics_router,  prefix="/analytics")

# ── ML Models ──────────────────────────────────────
from src.ml_model import (
    predict_category,
    predict_category_proba,
    predict_risk_score,
    get_model_info,
)


# ── Request Schemas ────────────────────────────────
class CategoryRequest(BaseModel):
    description: str


class RiskRequest(BaseModel):
    lat: float
    lon: float
    severity: Optional[int]   = 3
    victim_age: Optional[int] = 30
    weapon: Optional[str]     = "Unknown"
    victim_gender: Optional[str]  = "Unknown"
    crime_category: Optional[str] = "Other"
    datetime_str: Optional[str]   = None   # "2024-03-15T22:00:00"
    area_crime_count: Optional[float]  = 1000.0
    area_avg_severity: Optional[float] = 2.5


# ── Base ───────────────────────────────────────────
@app.get("/")
async def root():
    return {"msg": "CrimeWatch API running"}


# ── ML Endpoints ───────────────────────────────────
@app.post("/predict/category")
async def predict_category_endpoint(req: CategoryRequest):
    """
    Predict crime category from a text description.

    Request:  { "description": "robbery at gunpoint" }
    Response: { "category": "Robbery", "probabilities": {...} }
    """
    if not req.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")
    try:
        category = predict_category(req.description)
        proba    = predict_category_proba(req.description)
        # Return top 5 probabilities only
        top5 = dict(list(proba.items())[:5])
        return {
            "category":      category,
            "probabilities": top5,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/risk")
async def predict_risk_endpoint(req: RiskRequest):
    """
    Predict risk score for a location and context.

    Request:  { "lat": 28.7041, "lon": 77.1025, "severity": 4, "weapon": "Knife" }
    Response: { "risk_score": 1842.5, "risk_level": "High", "risk_percent": 73.7 }
    """
    try:
        # Parse optional datetime string
        dt = None
        if req.datetime_str:
            try:
                dt = datetime.fromisoformat(req.datetime_str)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid datetime format. Use ISO format: 2024-03-15T22:00:00"
                )

        result = predict_risk_score(
            latitude=req.lat,
            longitude=req.lon,
            severity=req.severity,
            victim_age=req.victim_age,
            weapon=req.weapon,
            victim_gender=req.victim_gender,
            crime_category=req.crime_category,
            dt=dt,
            area_crime_count=req.area_crime_count,
            area_avg_severity=req.area_avg_severity,
        )
        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk prediction failed: {str(e)}")


@app.get("/model-info")
async def model_info_endpoint():
    """
    Health check for ML models.
    Response: { "category_model": {...}, "risk_model": {...} }
    """
    return get_model_info()