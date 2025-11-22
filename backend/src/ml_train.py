# ml_train.py
import pandas as pd
import joblib
import os
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
csv_path = os.path.join(ROOT, "data", "cleaned_crime_dataset.csv")
df = pd.read_csv(csv_path)

X = df["Crime Description"].fillna("").astype(str)
y = df["Clean Category"].fillna("Other").astype(str)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english", max_features=5000)),
    ("clf", MultinomialNB())
])

pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)

print("Classification report:\n", classification_report(y_test, y_pred))

model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
joblib.dump(pipeline, model_path)
print("Saved model to", model_path)
