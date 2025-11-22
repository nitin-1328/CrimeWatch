# auth.py
from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
import os

# FIXED IMPORT
from src.db import users_coll

SECRET = os.getenv("JWT_SECRET", "CHANGE_THIS_TO_A_LONG_SECRET")
ALGO = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()

class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(payload: RegisterSchema):
    exists = await users_coll.find_one({"email": payload.email})
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = pwd_context.hash(payload.password)
    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hashed,
        "created_at": datetime.utcnow()
    }
    await users_coll.insert_one(user_doc)
    return {"msg": "registered"}

@router.post("/login")
async def login(payload: LoginSchema):
    user = await users_coll.find_one({"email": payload.email})
    if not user or not pwd_context.verify(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {"sub": payload.email, "exp": datetime.utcnow() + timedelta(hours=12)},
        SECRET,
        algorithm=ALGO
    )
    return {"access_token": token, "token_type": "bearer"}
