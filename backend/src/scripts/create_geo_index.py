# SAFE GEO INDEX SCRIPT
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "crimewatch_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
coll = db["incidents"]

def is_valid_number(val):
    try:
        val = float(val)
        return True
    except:
        return False

count_updated = 0
count_skipped = 0

for doc in coll.find({"location": {"$exists": False}}):
    lat = doc.get("Latitude")
    lon = doc.get("Longitude")

    if not is_valid_number(lat) or not is_valid_number(lon):
        count_skipped += 1
        continue

    lat = float(lat)
    lon = float(lon)

    coll.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "location": {
                "type": "Point",
                "coordinates": [lon, lat]
            }
        }}
    )
    count_updated += 1

print(f"Updated {count_updated} documents with valid coordinates.")
print(f"Skipped {count_skipped} invalid documents.")

# Create geo index
coll.create_index([("location", "2dsphere")])

print("Geo index created successfully!")
