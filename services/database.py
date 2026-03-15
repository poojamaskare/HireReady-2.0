"""
Database connection setup for Supabase PostgreSQL.

Uses SQLAlchemy with the connection string from .env.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fall back to a local SQLite file for development/testing so importing
    # the application doesn't crash when env vars are not configured.
    import logging

    logging.getLogger(__name__).warning(
        "DATABASE_URL not set; falling back to sqlite database './hireready_dev.db' for local development."
    )
    DATABASE_URL = "sqlite:///./hireready_dev.db"
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}, pool_pre_ping=True
    )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
