# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="CrimeWatch API")

origins = ["*"]  # change to your frontend domain in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# EXISTING IMPORTS
# ----------------------------------------------------
from src.incidents import router as incidents_router
from src.auth import router as auth_router
from src.safe_route import router as safe_router

# ----------------------------------------------------
# NEW IMPORT (ADD THIS LINE)
# ----------------------------------------------------
from src.analytics import router as analytics_router
# ----------------------------------------------------

# ----------------------------------------------------
# ROUTERS
# ----------------------------------------------------
app.include_router(auth_router, prefix="/auth")
app.include_router(incidents_router, prefix="/incidents")
app.include_router(safe_router, prefix="/route")

# ----------------------------------------------------
# ADD THIS NEW ROUTER
# ----------------------------------------------------
app.include_router(analytics_router, prefix="/analytics")
# ----------------------------------------------------




@app.get("/")
async def root():
    return {"msg": "CrimeWatch API running"}
