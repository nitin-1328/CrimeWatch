import pandas as pd
from fastapi import APIRouter
from datetime import datetime
from sklearn.linear_model import LinearRegression
import numpy as np
import os

router = APIRouter()

DATA_PATH = "../data/cleaned_crime_dataset.csv"


df = pd.read_csv(DATA_PATH)

# -----------------------------
# CLEAN + PREP DATA
# -----------------------------
df['Date Reported'] = pd.to_datetime(df['Date Reported'], errors='coerce')
df = df.dropna(subset=['Date Reported'])

# Extract year-month for grouping
df['year_month'] = df['Date Reported'].dt.to_period('M').astype(str)


# -----------------------------
# API 1 — Monthly trend + forecast
# -----------------------------
@router.get("/monthly_trend")
def monthly_trend():

    monthly = df.groupby("year_month").size().reset_index(name="count")

    # Prepare for regression forecast
    X = np.arange(len(monthly)).reshape(-1, 1)
    y = monthly["count"].values

    model = LinearRegression()
    model.fit(X, y)

    # Predict next 3 months
    future_steps = 3
    X_future = np.arange(len(monthly), len(monthly) + future_steps).reshape(-1, 1)
    y_future = model.predict(X_future)

    future_months = []
    last_date = pd.to_datetime(monthly["year_month"].iloc[-1] + "-01")
    for i in range(1, future_steps + 1):
        new_month = last_date + pd.DateOffset(months=i)
        future_months.append(new_month.strftime("%Y-%m"))

    return {
        "historical": {
            "labels": monthly["year_month"].tolist(),
            "values": monthly["count"].tolist(),
        },
        "forecast": {
            "labels": future_months,
            "values": y_future.tolist(),
        }
    }


# -----------------------------
# API 2 — Top Cities by Crime Count
# -----------------------------
@router.get("/top_cities")
def top_cities():
    city_counts = (
        df.groupby("City")
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
        .head(10)
    )

    return {
        "labels": city_counts["City"].tolist(),
        "values": city_counts["count"].tolist(),
    }
