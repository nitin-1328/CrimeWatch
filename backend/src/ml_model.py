# ml_model.py
import os
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
_model = None

def load_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError("Model not found. Run ml_train.py first.")
        _model = joblib.load(MODEL_PATH)
    return _model

def predict_category(text):
    model = load_model()
    return model.predict([text])[0]
