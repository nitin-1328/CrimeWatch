import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "crimewatch_db")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
incidents_coll = db["incidents"]
users_coll = db["users"]
