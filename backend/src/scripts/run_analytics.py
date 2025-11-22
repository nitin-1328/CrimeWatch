# run_analytics.py
# Usage: activate venv then: python src/scripts/run_analytics.py
import os
import math
import json
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from pymongo import MongoClient

# load env vars if needed
from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "crimewatch_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
incidents = db["incidents"]
analytics = db["analytics"]  # will upsert results

def load_incidents_df():
    cursor = incidents.find({}, {"Reported At":1, "Clean Category":1, "Latitude":1, "Longitude":1})
    rows = []
    for d in cursor:
        dt = d.get("Reported At")
        if not dt:
            continue
        # ensure datetime
        if isinstance(dt, str):
            try:
                dt = pd.to_datetime(dt)
            except:
                continue
        rows.append({
            "reported_at": pd.to_datetime(dt),
            "category": d.get("Clean Category", "Other"),
            "lat": d.get("Latitude"),
            "lon": d.get("Longitude")
        })
    if not rows:
        return pd.DataFrame(columns=["reported_at","category","lat","lon"])
    df = pd.DataFrame(rows)
    # drop missing coords
    df = df.dropna(subset=["reported_at"])
    return df

def monthly_trend_forecast(df, months_ahead=6):
    # group by month
    if df.empty:
        return {"series": [], "forecast": []}
    df["month"] = df["reported_at"].dt.to_period("M").dt.to_timestamp()
    monthly = df.groupby("month").size().rename("count").reset_index()
    monthly = monthly.sort_values("month")
    # linear regression on month index
    monthly["t"] = np.arange(len(monthly))
    X = monthly[["t"]].values
    y = monthly["count"].values
    if len(y) < 2:
        # not enough points -> return series only
        series = [{"month": m.strftime("%Y-%m"), "count": int(c)} for m,c in zip(monthly["month"], monthly["count"])]
        return {"series": series, "forecast": []}
    model = LinearRegression()
    model.fit(X,y)
    # forecast next months
    future_t = np.arange(len(monthly), len(monthly)+months_ahead).reshape(-1,1)
    preds = model.predict(future_t).clip(min=0)
    series = [{"month": m.strftime("%Y-%m"), "count": int(c)} for m,c in zip(monthly["month"], monthly["count"])]
    last_month = monthly["month"].max()
    forecast = []
    for i, p in enumerate(preds):
        next_month = (last_month + pd.DateOffset(months=i+1)).strftime("%Y-%m")
        forecast.append({"month": next_month, "predicted": float(round(float(p),2))})
    return {"series": series, "forecast": forecast}

def category_breakdown(df, top_n=10):
    if df.empty:
        return []
    cat = df["category"].fillna("Other").value_counts().head(top_n)
    return [{"category": idx, "count": int(v)} for idx,v in cat.items()]

def hourly_distribution(df):
    if df.empty:
        return []
    df["hour"] = df["reported_at"].dt.hour
    h = df.groupby("hour").size().reindex(range(24), fill_value=0)
    return [{"hour": int(hh), "count": int(cnt)} for hh,cnt in zip(h.index, h.values)]

def cluster_hotspots(df, n_clusters=6):
    # cluster using lat/lon where available
    pts = df.dropna(subset=["lat","lon"])
    if pts.empty:
        return []
    coords = pts[["lat","lon"]].values
    # if not enough points reduce clusters
    k = min(n_clusters, len(coords))
    km = KMeans(n_clusters=k, random_state=42)
    km.fit(coords)
    centers = km.cluster_centers_
    counts = {}
    labels = km.labels_
    for lab in labels:
        counts[lab] = counts.get(lab, 0) + 1
    res = []
    for i, c in enumerate(centers):
        res.append({
            "cluster_id": int(i),
            "lat": float(c[0]),
            "lon": float(c[1]),
            "count": int(counts.get(i,0))
        })
    # sort by count desc
    res = sorted(res, key=lambda x: x["count"], reverse=True)
    return res

def build_analytics():
    df = load_incidents_df()
    trends = monthly_trend_forecast(df)
    categories = category_breakdown(df)
    hourly = hourly_distribution(df)
    clusters = cluster_hotspots(df, n_clusters=8)

    doc = {
        "generated_at": datetime.utcnow(),
        "trends": trends,
        "categories": categories,
        "hourly": hourly,
        "clusters": clusters,
        "total_incidents": int(len(df))
    }
    # upsert single analytics doc
    analytics.replace_one({"_id":"latest"}, doc, upsert=True)
    print("Analytics computed and saved to 'analytics' collection (id=latest).")

if __name__ == "__main__":
    build_analytics()
