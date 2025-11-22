🕵️ CrimeWatch AI
AI-powered Crime Prediction, Route Safety & Hotspot Visualization

FastAPI + React + MongoDB + Machine Learning + Google Maps API

📌 Overview

CrimeWatch AI is a full-stack machine learning project designed to predict crime risk, show safe routes, visualize hotspots, and store incidents in MongoDB.
It combines:

🧠 Machine Learning

🗺️ Google Maps

🍃 MongoDB

🚀 FastAPI backend

⚛️ React + Vite frontend

📊 Analytics & Safe Routing

📁 Project Structure
CrimeWatch/
│
├── backend/
│   ├── src/
│   │   ├── analytics.py          # Crime analytics logic
│   │   ├── auth.py               # JWT / Login system (if used)
│   │   ├── db.py                 # MongoDB connection
│   │   ├── incidents.py          # Store + fetch crime incidents API
│   │   ├── main.py               # FastAPI main entry
│   │   ├── ml_train.py           # Model training script
│   │   ├── ml_model.py           # Model loader + predictor
│   │   ├── safe_route.py         # Safe route calculation API
│   │   ├── model.pkl             # Trained ML model
│   ├── requirements.txt
│   ├── .env
│   └── venv/
│
├── data/
│   ├── cleaned_crime_dataset.csv # Preprocessed dataset
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
│
└── README.md

🧠 Machine Learning

Your ML workflow uses the dataset in data/cleaned_crime_dataset.csv.

Models Used

K-Nearest Neighbors (KNN)

Naive Bayes

Logistic Regression

ml_train.py

Loads dataset

Preprocesses features

Trains all 3 models

Selects best one

Saves final model → model.pkl

ml_model.py

Loads & predicts crime level:

from ml_model import load_model
model = load_model()


Prediction returns:

{
  "risk": "High",
  "confidence": 0.87
}

🍃 MongoDB (db.py)

Your backend connects to MongoDB:

from pymongo import MongoClient
client = MongoClient(os.getenv("MONGO_URI"))
db = client["crimewatch"]

Collections used:
Collection	Purpose
incidents	Save user-reported crimes
predictions	Log all ML predictions
hotspots	Store coordinates of high-risk areas

Add this in .env:

MONGO_URI=mongodb://localhost:27017
SECRET_KEY=your_jwt_secret

🧩 Backend Setup (FastAPI)
1. Create virtual env
python -m venv venv

2. Activate

Windows

venv\Scripts\activate


Mac/Linux

source venv/bin/activate

3. Install dependencies
pip install -r backend/requirements.txt

4. Run FastAPI

Inside backend/:

uvicorn src.main:app --reload --port 8000

Backend runs at:

http://localhost:8000

Swagger UI: http://localhost:8000/docs

💻 Frontend Setup (React + Vite)
1. Install dependencies
cd frontend
npm install

2. Add frontend .env
VITE_BACKEND_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_KEY

3. Start frontend
npm run dev


Runs at:
👉 http://localhost:5173

🗺️ Google Maps Features

Shows real-time map

Pins crime hotspots (from MongoDB)

Highlights high-risk zones

Safe route computation (backend → safe_route.py)

📡 API Endpoints
POST /predict

Predict risk level using ML model.

POST /incident/add

Adds a new crime incident to MongoDB.

GET /incidents

Fetch all stored incidents.

GET /safe-route

Suggests low-crime path between two points.

GET /analytics

Returns crime statistics.

📊 Dataset

cleaned_crime_dataset.csv contains:

Column	Description
Date	Crime date/time
City	City name
Lat	Latitude
Lng	Longitude
Crime_Type	Category
Weapon	Weapon used
Severity	ML target label
Arrested	Yes/No
etc.	
🧑‍💻 Tech Stack
Backend

FastAPI

MongoDB

Python

Scikit-learn

Uvicorn

JWT (if used)

Frontend

React

Vite

Axios

Google Maps API

⭐ Contributing

Pull requests are welcome!
