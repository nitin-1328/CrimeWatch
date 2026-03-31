# auth.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
import os
import httpx

from src.db import users_coll

SECRET = os.getenv("JWT_SECRET", "CHANGE_THIS_TO_A_LONG_SECRET")
ALGO = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()


def create_token(email: str) -> str:
    return jwt.encode(
        {"sub": email, "exp": datetime.utcnow() + timedelta(hours=12)},
        SECRET,
        algorithm=ALGO
    )


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
    await users_coll.insert_one({
        "name": payload.name,
        "email": payload.email,
        "password_hash": hashed,
        "created_at": datetime.utcnow()
    })
    return {"msg": "registered"}


@router.post("/login")
async def login(payload: LoginSchema):
    user = await users_coll.find_one({"email": payload.email})
    if not user or not pwd_context.verify(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(payload.email)
    return {"access_token": token, "token_type": "bearer"}


# ── Google OAuth ──────────────────────────────────────────────
@router.get("/google/login")
async def google_login():
    """Redirect user to Google's OAuth consent screen."""
    params = (
        f"client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(code: str):
    # 1. Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        )
    token_data = token_res.json()
    print("TOKEN DATA:", token_data)  # ← add this to see errors

    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data["error"])

    # 2. Fetch user info from Google
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
    google_user = user_res.json()
    print("GOOGLE USER:", google_user)  # ← add this too

    email = google_user.get("email")
    name = google_user.get("name", email)

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

    # 3. Upsert user in MongoDB
    await users_coll.update_one(
        {"email": email},
        {"$setOnInsert": {"name": name, "email": email, "created_at": datetime.utcnow(), "auth_provider": "google"}},
        upsert=True
    )

    # 4. Redirect to frontend with token — use 302 not 307
    token = create_token(email)
    return RedirectResponse(
        url=f"{FRONTEND_URL}/auth/callback?token={token}",
        status_code=302  # ← this is the key fix
    )