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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.incidents  import router as incidents_router
from src.auth       import router as auth_router
from src.safe_route import router as safe_router
from src.analytics  import router as analytics_router

app.include_router(auth_router,       prefix="/auth")
app.include_router(incidents_router,  prefix="/incidents")
app.include_router(safe_router,       prefix="/route")
app.include_router(analytics_router,  prefix="/analytics")

from src.ml_model import (
    predict_category,
    predict_category_proba,
    predict_risk_score,
    get_model_info,
)

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
    datetime_str: Optional[str]   = None
    area_crime_count: Optional[float]  = 1000.0
    area_avg_severity: Optional[float] = 2.5

@app.get("/")
async def root():
    return {"msg": "CrimeWatch API running"}

@app.post("/predict/category")
async def predict_category_endpoint(req: CategoryRequest):
    if not req.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")
    try:
        category = predict_category(req.description)
        proba    = predict_category_proba(req.description)
        top5 = dict(list(proba.items())[:5])
        return {"category": category, "probabilities": top5}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict/risk")
async def predict_risk_endpoint(req: RiskRequest):
    try:
        dt = None
        if req.datetime_str:
            try:
                dt = datetime.fromisoformat(req.datetime_str)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid datetime format.")
        result = predict_risk_score(
            latitude=req.lat, longitude=req.lon, severity=req.severity,
            victim_age=req.victim_age, weapon=req.weapon,
            victim_gender=req.victim_gender, crime_category=req.crime_category,
            dt=dt, area_crime_count=req.area_crime_count,
            area_avg_severity=req.area_avg_severity,
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk prediction failed: {str(e)}")

@app.get("/model-info")
async def model_info_endpoint():
    return get_model_info()