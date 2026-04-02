"""Authentication and JWT helpers for HireReady backend."""

import os
import uuid as _uuid
import logging
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from services.database import get_db
from services.models import User, TpoLogin

load_dotenv()
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

# ── Password hashing ─────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    # Legacy/malformed stored values should not crash auth flow.
    if not hashed:
        return False
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        logger.warning("Password verification failed due to invalid stored hash format")
        return False


# ── JWT helpers ───────────────────────────────────────────────────────────────
def create_access_token(user_id: str, role: str = "student") -> str:
    """Create a JWT containing user UUID + role, valid for JWT_EXPIRE_HOURS."""
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode a JWT and return {user_id, role}. Raises on failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "student")
        if not user_id:
            raise JWTError("Missing subject claim")
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI dependency ────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate JWT, returning the current user row.
    For TPOs the subject is their email (stored in TPO_login).
    For students the subject is their UUID (stored in users).
    """
    claims = decode_access_token(token)
    role = claims.get("role", "student")
    subject = claims["user_id"]

    # TPO: look up in TPO_login table, then wrap in a User-like object
    if role == "tpo":
        tpo = db.query(TpoLogin).filter(TpoLogin.email == subject).first()
        if tpo is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="TPO not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Return a lightweight User-compatible object so downstream code works
        proxy = User(
            name=tpo.email,
            email=tpo.email,
            role="tpo",
            password_hash="",
        )
        # Deterministic UUID so it works with String(36) ID columns (Job.posted_by etc.)
        proxy.id = str(_uuid.uuid5(_uuid.NAMESPACE_DNS, tpo.email))
        return proxy

    # Student: standard users table lookup
    user = db.query(User).filter(User.id == subject).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(required_role: str):
    """Factory: returns a dependency that checks the user has the given role."""
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires '{required_role}' role.",
            )
        return current_user
    return checker


# Convenience dependencies
get_current_student = require_role("student")
get_current_tpo = require_role("tpo")
