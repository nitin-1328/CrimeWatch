# ml_train.py
import pandas as pd
import joblib
import os
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, mean_absolute_error, r2_score

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
csv_path = os.path.join(ROOT, "data", "cleaned_crime_dataset.csv")
df = pd.read_csv(csv_path)

print(f"Loaded dataset: {len(df)} rows, {len(df.columns)} columns")

# ─────────────────────────────────────────────
# MODEL 1: Crime Category Classifier (TF-IDF)
# Same as before, predicts Clean Category from
# Crime Description text
# ─────────────────────────────────────────────
print("\n--- Training Model 1: Crime Category Classifier ---")

X_text = df["Crime Description"].fillna("").astype(str)
y_cat  = df["Clean Category"].fillna("Other").astype(str)

X_tr, X_te, y_tr, y_te = train_test_split(X_text, y_cat, test_size=0.2, random_state=42)

category_pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english", max_features=5000)),
    ("clf",   MultinomialNB())
])

category_pipeline.fit(X_tr, y_tr)
y_pred = category_pipeline.predict(X_te)
print("Classification Report:\n", classification_report(y_te, y_pred))

# Save model 1
model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
joblib.dump(category_pipeline, model_path)
print(f"Saved category model → {model_path}")


# ─────────────────────────────────────────────
# MODEL 2: Risk Score Predictor
# Uses the new engineered columns from the
# enhanced dataset to predict Risk_Score
# ─────────────────────────────────────────────

# Check if enhanced columns exist
enhanced_cols = [
    'Crime_Hour', 'Crime_Month', 'Is_Weekend',
    'Weapon_Risk', 'Area_Crime_Count', 'Area_Avg_Severity'
]
has_enhanced = all(col in df.columns for col in enhanced_cols)

if has_enhanced and 'Risk_Score' in df.columns:
    print("\n--- Training Model 2: Risk Score Predictor ---")

    # Encode categorical columns
    df['Gender_enc']   = LabelEncoder().fit_transform(df['Victim Gender'].fillna('Unknown'))
    df['Weapon_enc']   = LabelEncoder().fit_transform(df['Weapon Used'].fillna('Unknown'))
    df['Category_enc'] = LabelEncoder().fit_transform(df['Clean Category'].fillna('Other'))

    feature_cols = [
        'Latitude', 'Longitude',
        'Severity', 'Victim Age',
        'Crime_Hour', 'Crime_Month', 'Is_Weekend',
        'Weapon_Risk', 'Area_Crime_Count', 'Area_Avg_Severity',
        'Gender_enc', 'Weapon_enc', 'Category_enc'
    ]

    # Drop rows with missing values in features
    df_risk = df[feature_cols + ['Risk_Score']].dropna()

    X_risk = df_risk[feature_cols]
    y_risk = df_risk['Risk_Score']

    X_tr2, X_te2, y_tr2, y_te2 = train_test_split(
        X_risk, y_risk, test_size=0.2, random_state=42
    )

    risk_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    risk_model.fit(X_tr2, y_tr2)

    y_pred2 = risk_model.predict(X_te2)
    print(f"MAE:  {mean_absolute_error(y_te2, y_pred2):.2f}")
    print(f"R²:   {r2_score(y_te2, y_pred2):.4f}")

    # Feature importance
    importances = pd.Series(risk_model.feature_importances_, index=feature_cols)
    print("\nTop feature importances:")
    print(importances.sort_values(ascending=False).head(8).to_string())

    # Save model 2
    risk_model_path = os.path.join(os.path.dirname(__file__), "risk_model.pkl")
    joblib.dump(risk_model, risk_model_path)

    # Save feature column list so ml_model.py knows the order
    meta_path = os.path.join(os.path.dirname(__file__), "risk_model_features.pkl")
    joblib.dump(feature_cols, meta_path)

    print(f"\nSaved risk model     → {risk_model_path}")
    print(f"Saved feature list   → {meta_path}")

else:
    print("\nSkipping Model 2 — enhanced columns not found.")
    print("Switch to enhanced_crime_dataset_with_time_period.csv to enable it.")

print("\nAll done!")