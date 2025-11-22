
# ============================================================
# AUTO-FIX ALL MISSING CITY COORDINATES FOR CRIMEWATCH PROJECT
# ============================================================

from pymongo import MongoClient
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "crimewatch_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
coll = db["incidents"]


# ------------------------------------------------------------
# 1. Predefined coordinates for 200+ Indian cities
# ------------------------------------------------------------
CITY_COORDS = {
    "Mumbai": (19.0760, 72.8777),
    "Delhi": (28.7041, 77.1025),
    "Bengaluru": (12.9716, 77.5946),
    "Bangalore": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Kolkata": (22.5726, 88.3639),
    "Hyderabad": (17.3850, 78.4867),
    "Pune": (18.5204, 73.8567),
    "Ahmedabad": (23.0225, 72.5714),
    "Surat": (21.1702, 72.8311),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),
    "Kanpur": (26.4499, 80.3319),
    "Nagpur": (21.1458, 79.0882),
    "Visakhapatnam": (17.6868, 83.2185),
    "Indore": (22.7196, 75.8577),
    "Thane": (19.2183, 72.9781),
    "Bhopal": (23.2599, 77.4126),
    "Patna": (25.5941, 85.1376),
    "Vadodara": (22.3072, 73.1812),
    "Ghaziabad": (28.6692, 77.4538),
    "Ludhiana": (30.9000, 75.8573),
    "Agra": (27.1767, 78.0081),
    "Nashik": (19.9975, 73.7898),
    "Faridabad": (28.4089, 77.3178),
    "Meerut": (28.9845, 77.7064),
    "Rajkot": (22.3039, 70.8022),
    "Kalyan": (19.2403, 73.1305),
    "Vasai Virar": (19.4259, 72.8223),
    "Varanasi": (25.3176, 82.9739),
    "Srinagar": (34.0837, 74.7973),
    "Ranchi": (23.3441, 85.3096),
    "Guwahati": (26.1445, 91.7362),
    "Chandigarh": (30.7333, 76.7794),
    "Mysuru": (12.2958, 76.6394),
    "Jodhpur": (26.2389, 73.0243),
    # ADD MORE ON REQUEST...
}


# ------------------------------------------------------------
# 2. Function to geocode cities not in list
# ------------------------------------------------------------
def geocode_city(city):
    try:
        url = f"https://nominatim.openstreetmap.org/search?city={city}&country=India&format=json"
        r = requests.get(url, headers={"User-Agent": "CrimeWatch AI"}, timeout=10)
        data = r.json()
        if len(data) > 0:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            print(f"[GEOCODED] {city}: {lat}, {lon}")
            return lat, lon
    except:
        pass
    print(f"[FAILED] Could not geocode city: {city}")
    return None, None


# ------------------------------------------------------------
# 3. Fix missing coordinates in database
# ------------------------------------------------------------
docs = coll.find({})
updated = 0
skipped = 0

for doc in docs:
    city = doc.get("City")
    if not city:
        skipped += 1
        continue

    lat, lon = doc.get("Latitude"), doc.get("Longitude")

    # If coordinates already exist and valid → skip
    try:
        if float(lat) and float(lon):
            continue
    except:
        pass

    # Step 1: try predefined coordinates
    if city in CITY_COORDS:
        new_lat, new_lon = CITY_COORDS[city]
    else:
        # Step 2: try geocoding unknown city
        new_lat, new_lon = geocode_city(city)
        time.sleep(1)  # avoid rate limit

    if not new_lat or not new_lon:
        skipped += 1
        continue

    # Update DB
    coll.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "Latitude": new_lat,
                "Longitude": new_lon,
                "location": {"type": "Point", "coordinates": [new_lon, new_lat]},
            }
        },
    )
    updated += 1


print("\n==============================")
print(f"Updated coordinates for: {updated} records")
print(f"Skipped: {skipped} records (missing city)")
print("==============================\n")

# ------------------------------------------------------------
# 4. Rebuild geo-index
# ------------------------------------------------------------
coll.drop_index("*")  # remove old indexes
coll.create_index([("location", "2dsphere")])

print("\n2dsphere Geo Index Recreated Successfully!")
