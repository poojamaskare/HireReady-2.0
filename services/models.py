"""
SQLAlchemy ORM models for HireReady 2.0.

Tables:
  - users:            Registered user accounts (students + TPOs)
  - analysis_results: Stored analysis outcomes linked to a user
  - quiz_results:     Quiz attempt records
  - jobs:             Job postings created by TPOs
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from services.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False, default="student")  # "student" | "tpo"
    github_username = Column(String(100), default="")
    leetcode_username = Column(String(100), default="")
    mobile_number = Column(String(20), default="")
    moodle_id = Column(String(8), nullable=True)
    year = Column(String(4), nullable=True)       # FE, SE, TE, BE
    division = Column(String(1), nullable=True)   # A, B, C
    semester = Column(Integer, nullable=True)     # 1-8
    sgpa = Column(Float, nullable=True)           # 0.0-10.0
    atkt_count = Column(Integer, default=0)
    atkt_subjects = Column(Text, default="")
    drop_year = Column(String(3), default="No")   # "Yes" | "No"
    internships = Column(JSON, default=list)      # [{company, duration, domain, knowledge}]
    projects = Column(JSON, default=list)         # [{title, techStack, description}]
    core_interests = Column(Text, default="")
    core_skills = Column(Text, default="")
    github_profile = Column(Text, default="")
    linkedin_profile = Column(Text, default="")
    achievements = Column(Text, default="")
    cgpa = Column(Float, nullable=True)
    certifications = Column(Text, default="")        # comma-separated
    preferred_job_roles = Column(Text, default="")    # comma-separated
    resume_score = Column(Float, nullable=True)        # from latest analysis readiness_score
    resume_filename = Column(String(255), default="")
    resume_text = Column(Text, default="")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    analyses = relationship("AnalysisResult", back_populates="user")
    quizzes = relationship("QuizResult", back_populates="user")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_text_preview = Column(String(200), default="")
    github_username = Column(String(100), default="")
    leetcode_username = Column(String(100), default="")
    features = Column(JSON, nullable=False)
    readiness_score = Column(Float, nullable=False)
    readiness_category = Column(String(50), nullable=False)
    recommended_roles = Column(JSON, nullable=False)
    
    # New category scores (0-10)
    education_score = Column(Float, default=0.0)
    skills_score = Column(Float, default=0.0)
    contact_score = Column(Float, default=0.0)
    internship_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    project_score = Column(Float, default=0.0)
    
    ai_suggestions = Column(JSON, default=list) # List of strings
    missing_details = Column(JSON, default=dict) # dict of lists

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship back to user
    user = relationship("User", back_populates="analyses")


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(100), nullable=False)
    difficulty = Column(String(50), default="Medium")
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    questions = Column(JSON, nullable=False, default=list) # Added to store the generated questions
    answers = Column(JSON, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="quizzes")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    posted_by = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    description = Column(Text, default="")
    eligibility = Column(Text, default="")
    job_role = Column(String(255), default="")             # target role
    min_cgpa = Column(Float, nullable=True)                # minimum CGPA filter
    required_certifications = Column(Text, default="")     # comma-separated
    preferred_skills = Column(Text, default="")             # comma-separated skills
    package_lpa = Column(Float, nullable=True)                # package per annum in LPA
    deadline = Column(String(100), default="")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class TpoLogin(Base):
    """Separate table for TPO admin credentials (TPO_login)."""
    __tablename__ = "TPO_login"

    email = Column(String(255), primary_key=True)
    password = Column(Text, nullable=False)