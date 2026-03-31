# analytics.py
import pandas as pd
from fastapi import APIRouter, Query
from sklearn.linear_model import LinearRegression
import numpy as np
import os
from typing import Optional

router = APIRouter()

BASE      = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
DATA_PATH = os.path.join(BASE, "cleaned_crime_dataset.csv")

# ── Load + prep once at startup ────────────────────
df = pd.read_csv(DATA_PATH)
df['Date Reported'] = pd.to_datetime(df['Date Reported'], errors='coerce')
df = df.dropna(subset=['Date Reported'])
df['year_month']  = df['Date Reported'].dt.to_period('M').astype(str)
df['day_of_week'] = df['Date Reported'].dt.day_name()
df['hour']        = df['Date Reported'].dt.hour
df['Severity']    = pd.to_numeric(df['Severity'], errors='coerce').fillna(1)
df['Weapon Used'] = df['Weapon Used'].fillna('None')

if 'Crime_Time_Period' not in df.columns:
    def get_tp(h):
        if 6  <= h < 12: return "Morning"
        if 12 <= h < 17: return "Afternoon"
        if 17 <= h < 21: return "Evening"
        return "Night"
    df['Crime_Time_Period'] = df['hour'].apply(get_tp)

# ── Pre-compute global cache ───────────────────────
print("[analytics] Pre-computing analytics cache...")

_monthly = df.groupby("year_month").size().reset_index(name="count")
_X = np.arange(len(_monthly)).reshape(-1,1)
_y = _monthly["count"].values
_model = LinearRegression().fit(_X, _y)
_future_steps = 3
_X_future  = np.arange(len(_monthly), len(_monthly)+_future_steps).reshape(-1,1)
_y_future  = _model.predict(_X_future).tolist()
_last_date = pd.to_datetime(_monthly["year_month"].iloc[-1] + "-01")
_future_months = [(_last_date + pd.DateOffset(months=i)).strftime("%Y-%m") for i in range(1, _future_steps+1)]
_monthly_cache = {
    "historical": {"labels": _monthly["year_month"].tolist(), "values": _monthly["count"].tolist()},
    "forecast":   {"labels": _future_months, "values": _y_future},
}

_city    = df.groupby("City").size().reset_index(name="count").sort_values("count", ascending=False).head(10)
_top_cities_cache = {"labels": _city["City"].tolist(), "values": _city["count"].tolist()}

_cat = df.groupby("Clean Category").size().reset_index(name="count").sort_values("count", ascending=False)
_category_cache = {"labels": _cat["Clean Category"].tolist(), "values": _cat["count"].tolist()}

_order = ["Morning","Afternoon","Evening","Night"]
_time  = df.groupby("Crime_Time_Period").size().reset_index(name="count")
_time["sort"] = _time["Crime_Time_Period"].map({v:i for i,v in enumerate(_order)})
_time = _time.sort_values("sort")
_time_cache = {"labels": _time["Crime_Time_Period"].tolist(), "values": _time["count"].tolist()}

_day_order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
_day = df.groupby("day_of_week").size().reset_index(name="count")
_day["sort"] = _day["day_of_week"].map({v:i for i,v in enumerate(_day_order)})
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
        .apply(lambda x: round((x["Case Closed"]=="Yes").sum() / len(x) * 100, 1))
        .reset_index(name="rate")
        .sort_values("rate", ascending=False)
        .head(10)
    )
    _closure_cache = {"labels": _closure["City"].tolist(), "values": _closure["rate"].tolist()}
else:
    _closure_cache = {"labels": [], "values": []}

# Weapon stats cache
_weapon = df.groupby("Weapon Used").size().reset_index(name="count").sort_values("count", ascending=False)
_weapon_cache = {"labels": _weapon["Weapon Used"].tolist(), "values": _weapon["count"].tolist()}

# All cities list
_all_cities = sorted(df["City"].dropna().unique().tolist())
# All weapons list
_all_weapons = sorted(df["Weapon Used"].dropna().unique().tolist())
# All categories list
_all_categories = sorted(df["Clean Category"].dropna().unique().tolist())

print(f"[analytics] Cache ready — {len(df):,} records, {len(_all_cities)} cities")

# ── Routes ─────────────────────────────────────────
@router.get("/monthly_trend")
def monthly_trend(): return _monthly_cache

@router.get("/top_cities")
def top_cities(): return _top_cities_cache

@router.get("/category_stats")
def category_stats(): return _category_cache

@router.get("/time_stats")
def time_stats(): return _time_cache

@router.get("/day_stats")
def day_stats(): return _day_cache

@router.get("/severity_stats")
def severity_stats(): return _severity_cache

@router.get("/closure_rate")
def closure_rate(): return _closure_cache

@router.get("/weapon_stats")
def weapon_stats(): return _weapon_cache

@router.get("/filters")
def get_filters():
    """Returns available filter options for the frontend."""
    return {
        "cities":     _all_cities,
        "weapons":    _all_weapons,
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

        # Category breakdown
        cat = city_df.groupby("Clean Category").size().reset_index(name="count").sort_values("count", ascending=False)
        # Severity breakdown
        sev = city_df.groupby("Severity").size().reset_index(name="count").sort_values("Severity")
        # Time of day
        time_s = city_df.groupby("Crime_Time_Period").size().reset_index(name="count")
        time_s["sort"] = time_s["Crime_Time_Period"].map({v:i for i,v in enumerate(_order)})
        time_s = time_s.sort_values("sort")
        # Top weapon
        top_weapon = city_df["Weapon Used"].value_counts().head(1)
        # Monthly trend
        monthly = city_df.groupby("year_month").size().reset_index(name="count")

        result[city] = {
            "total":       len(city_df),
            "categories":  {"labels": cat["Clean Category"].tolist(), "values": cat["count"].tolist()},
            "severity":    {"labels": [f"Level {int(s)}" for s in sev["Severity"].tolist()], "values": sev["count"].tolist()},
            "time_of_day": {"labels": time_s["Crime_Time_Period"].tolist(), "values": time_s["count"].tolist()},
            "top_weapon":  top_weapon.index[0] if len(top_weapon) else "Unknown",
            "monthly":     {"labels": monthly["year_month"].tolist(), "values": monthly["count"].tolist()},
            "avg_severity": round(float(city_df["Severity"].mean()), 2),
            "closure_rate": round((city_df["Case Closed"]=="Yes").mean()*100, 1) if "Case Closed" in city_df.columns else 0,
        }

    return result


@router.get("/weapon_analysis")
def weapon_analysis(weapon: Optional[str] = Query(None), city: Optional[str] = Query(None)):
    """
    Detailed analysis for a specific weapon — which crime categories,
    cities, times, and severity levels it appears in most.
    weapon = e.g. "Knife"
    city   = optional city filter
    """
    filtered = df.copy()
    if weapon:
        filtered = filtered[filtered["Weapon Used"] == weapon]
    if city:
        filtered = filtered[filtered["City"] == city]

    if filtered.empty:
        return {"error": "No data for this filter"}

    cat  = filtered.groupby("Clean Category").size().reset_index(name="count").sort_values("count", ascending=False)
    city_cnt = filtered.groupby("City").size().reset_index(name="count").sort_values("count", ascending=False).head(10)
    time_s = filtered.groupby("Crime_Time_Period").size().reset_index(name="count")
    time_s["sort"] = time_s["Crime_Time_Period"].map({v:i for i,v in enumerate(_order)})
    time_s = time_s.sort_values("sort")
    sev = filtered.groupby("Severity").size().reset_index(name="count").sort_values("Severity")
    day_s = filtered.groupby("day_of_week").size().reset_index(name="count")
    day_s["sort"] = day_s["day_of_week"].map({v:i for i,v in enumerate(_day_order)})
    day_s = day_s.sort_values("sort")

    return {
        "total":       len(filtered),
        "weapon":      weapon or "All",
        "city":        city or "All",
        "categories":  {"labels": cat["Clean Category"].tolist(), "values": cat["count"].tolist()},
        "cities":      {"labels": city_cnt["City"].tolist(), "values": city_cnt["count"].tolist()},
        "time_of_day": {"labels": time_s["Crime_Time_Period"].tolist(), "values": time_s["count"].tolist()},
        "severity":    {"labels": [f"Level {int(s)}" for s in sev["Severity"].tolist()], "values": sev["count"].tolist()},
        "day_of_week": {"labels": day_s["day_of_week"].tolist(), "values": day_s["count"].tolist()},
        "avg_severity": round(float(filtered["Severity"].mean()), 2),
    }


@router.get("/summary")
def summary():
    sevVals = _severity_cache["values"]
    return {
        "monthly_trend":  _monthly_cache,
        "top_cities":     _top_cities_cache,
        "category_stats": _category_cache,
        "time_stats":     _time_cache,
        "day_stats":      _day_cache,
        "severity_stats": _severity_cache,
        "closure_rate":   _closure_cache,
        "weapon_stats":   _weapon_cache,
        "meta": {
            "total_records":    len(df),
            "cities_covered":   int(df["City"].nunique()),
            "high_risk_zones":  int((df["Severity"] >= 4).sum()),
            "case_closure_rate": round((df["Case Closed"]=="Yes").mean()*100, 1) if "Case Closed" in df.columns else 0,
        }
    }
