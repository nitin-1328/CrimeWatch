# ml_model.py
import os
import joblib
import numpy as np
from datetime import datetime

# ── Paths ──────────────────────────────────────────
BASE = os.path.dirname(__file__)
MODEL_PATH        = os.path.join(BASE, "model.pkl")
RISK_MODEL_PATH   = os.path.join(BASE, "risk_model.pkl")
RISK_FEATURES_PATH = os.path.join(BASE, "risk_model_features.pkl")

# ── Lazy-loaded globals ─────────────────────────────
_category_model = None
_risk_model     = None
_risk_features  = None


# ── Weapon risk mapping (matches ml_train.py encoding) ─
WEAPON_RISK_MAP = {
    "Firearm":      5.0,
    "Explosives":   5.0,
    "Knife":        3.0,
    "Blunt Object": 3.0,
    "Poison":       2.0,
    "Other":        2.0,
    "":             1.0,
    "Unknown":      1.0,
}


# ── Loaders ────────────────────────────────────────
def load_category_model():
    global _category_model
    if _category_model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError("Category model not found. Run ml_train.py first.")
        _category_model = joblib.load(MODEL_PATH)
    return _category_model


def load_risk_model():
    global _risk_model, _risk_features
    if _risk_model is None:
        if not os.path.exists(RISK_MODEL_PATH):
            raise FileNotFoundError("Risk model not found. Run ml_train.py first.")
        _risk_model    = joblib.load(RISK_MODEL_PATH)
        _risk_features = joblib.load(RISK_FEATURES_PATH)
    return _risk_model, _risk_features


# ── Public functions ───────────────────────────────

def predict_category(text: str) -> str:
    """
    Predict crime category from a text description.
    Example: predict_category("robbery at gunpoint") → "Robbery"
    """
    model = load_category_model()
    return model.predict([text])[0]


def predict_category_proba(text: str) -> dict:
    """
    Returns all category probabilities sorted by confidence.
    Example: {"Robbery": 0.82, "Assault": 0.10, ...}
    """
    model = load_category_model()
    proba  = model.predict_proba([text])[0]
    labels = model.classes_
    result = dict(zip(labels, proba.tolist()))
    return dict(sorted(result.items(), key=lambda x: x[1], reverse=True))


def predict_risk_score(
    latitude: float,
    longitude: float,
    severity: int        = 3,
    victim_age: int      = 30,
    weapon: str          = "Unknown",
    victim_gender: str   = "Unknown",
    crime_category: str  = "Other",
    dt: datetime         = None,
    area_crime_count: float  = 1000.0,
    area_avg_severity: float = 2.5,
) -> dict:
    """
    Predict risk score for a given location and context.

    Returns:
        {
            "risk_score":   float,
            "risk_level":   "Low" | "Medium" | "High",
            "risk_percent": float  (0–100)
        }
    """
    model, features = load_risk_model()

    if dt is None:
        dt = datetime.now()

    # Build feature vector in exact same order as training
    weapon_risk  = WEAPON_RISK_MAP.get(weapon, 2.0)
    is_weekend   = 1 if dt.weekday() >= 5 else 0

    # Simple label encoding — must match ml_train.py LabelEncoder order
    # We use a hash-based fallback since LabelEncoders aren't saved
    gender_enc   = {"M": 0, "F": 1, "X": 2, "Unknown": 3}.get(victim_gender, 3)
    weapon_enc   = abs(hash(weapon)) % 10
    category_enc = abs(hash(crime_category)) % 20

    feature_vector = {
        "Latitude":          latitude,
        "Longitude":         longitude,
        "Severity":          severity,
        "Victim Age":        victim_age,
        "Crime_Hour":        dt.hour,
        "Crime_Month":       dt.month,
        "Is_Weekend":        is_weekend,
        "Weapon_Risk":       weapon_risk,
        "Area_Crime_Count":  area_crime_count,
        "Area_Avg_Severity": area_avg_severity,
        "Gender_enc":        gender_enc,
        "Weapon_enc":        weapon_enc,
        "Category_enc":      category_enc,
    }

    # Build array in correct feature order
    X = np.array([[feature_vector[f] for f in features]])

    score = float(model.predict(X)[0])

    # Classify into levels based on dataset risk score ranges
    if score < 500:
        level = "Low"
    elif score < 1500:
        level = "Medium"
    else:
        level = "High"

    # Normalize to 0–100 percent (max observed ~2500)
    risk_percent = round(min(score / 2500 * 100, 100), 1)

    return {
        "risk_score":   round(score, 2),
        "risk_level":   level,
        "risk_percent": risk_percent,
    }


def get_model_info() -> dict:
    """Returns info about loaded models — useful for a /model-info API endpoint."""
    return {
        "category_model": {
            "path":      MODEL_PATH,
            "loaded":    _category_model is not None,
            "available": os.path.exists(MODEL_PATH),
        },
        "risk_model": {
            "path":      RISK_MODEL_PATH,
            "loaded":    _risk_model is not None,
            "available": os.path.exists(RISK_MODEL_PATH),
        }
    }