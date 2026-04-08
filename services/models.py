"""
SQLAlchemy ORM models for HireReady 2.0.

Tables:
  - users:            Registered user accounts (students + TPOs)
  - analysis_results: Stored analysis outcomes linked to a user
  - quiz_results:     Quiz attempt records
  - jobs:             Job postings created by TPOs
  - interested_jobs:  Student ↔ Job interest mapping
  - notifications:    Student notification messages
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from services.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    first_name = Column(String(100), default="")
    last_name = Column(String(100), default="")
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False, default="student")  # "student" | "tpo"
    github_username = Column(String(100), default="")
    leetcode_username = Column(String(100), default="")
    mobile_number = Column(String(20), default="")
    prn_no = Column(String(20), nullable=True)
    moodle_id = Column(String(8), nullable=True)
    year = Column(String(4), nullable=True)       # FE, SE, TE, BE
    division = Column(String(1), nullable=True)   # A, B, C
    semester = Column(Integer, nullable=True)     # 1-8
    sgpa = Column(Float, nullable=True)           # 0.0-10.0
    marks_10th = Column(Float, nullable=True)
    marks_12th = Column(Float, nullable=True)
    diploma_avg = Column(Float, nullable=True)
    sem1 = Column(Float, nullable=True)
    sem2 = Column(Float, nullable=True)
    sem3 = Column(Float, nullable=True)
    sem4 = Column(Float, nullable=True)
    sem5 = Column(Float, nullable=True)
    sem6 = Column(Float, nullable=True)
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
    resume_url = Column(Text, default="")
    photo_url = Column(Text, default="")
    resume_text = Column(Text, default="")
    # Password reset
    password_reset_token = Column(String(100), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    analyses = relationship("AnalysisResult", back_populates="user")
    quizzes = relationship("QuizResult", back_populates="user")
    interested_jobs = relationship("InterestedJob", back_populates="student", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="student", cascade="all, delete-orphan")
    job_reviews = relationship("JobReview", back_populates="student", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    posted_by = Column(
        String(36),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    description = Column(Text, default="")
    eligibility = Column(Text, default="")
    job_role = Column(String(255), default="")             # target role
    min_cgpa = Column(Float, nullable=True)                # minimum CGPA filter
    min_resume_score = Column(Float, nullable=True)        # minimum resume score filter (max assumed 100)
    required_certifications = Column(Text, default="")     # comma-separated
    preferred_skills = Column(Text, default="")             # comma-separated skills
    package_lpa = Column(Float, nullable=True)                # package per annum in LPA
    deadline = Column(String(100), default="")
    company_logo = Column(Text, default="")                # base64 data URI
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    interested_students = relationship("InterestedJob", back_populates="job", cascade="all, delete-orphan")
    shortlisted_students = relationship("ShortlistedJob", back_populates="job", cascade="all, delete-orphan")
    reviews = relationship("JobReview", back_populates="job", cascade="all, delete-orphan")


class TpoLogin(Base):
    """Separate table for TPO admin credentials (TPO_login)."""
    __tablename__ = "TPO_login"

    email = Column(String(255), primary_key=True)
    first_name = Column(String(100), default="")
    last_name = Column(String(100), default="")
    password = Column(Text, nullable=False)
    # Password reset
    password_reset_token = Column(String(100), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)


class InterestedJob(Base):
    """Student ↔ Job interest mapping."""
    __tablename__ = "interested_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id = Column(
        String(36),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("student_id", "job_id", name="uq_student_job_interest"),
    )

    # Relationships
    student = relationship("User", back_populates="interested_jobs")
    job = relationship("Job", back_populates="interested_students")


class ShortlistedJob(Base):
    """Student ↔ Job shortlist mapping managed by TPO actions."""
    __tablename__ = "shortlisted_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id = Column(
        UUID(as_uuid=False),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    source = Column(String(20), nullable=False, default="manual")

    __table_args__ = (
        UniqueConstraint("student_id", "job_id", name="uq_student_job_shortlist"),
    )

    student = relationship("User")
    job = relationship("Job", back_populates="shortlisted_students")


class Notification(Base):
    """Student notification messages."""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message = Column(Text, nullable=False)
    status = Column(String(10), nullable=False, default="unread")  # "unread" | "read"
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    student = relationship("User", back_populates="notifications")


class JobResult(Base):
    """Round-wise result uploads by TPO for a job."""
    __tablename__ = "job_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(
        UUID(as_uuid=False),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    round_name = Column(String(100), nullable=False)
    result_status = Column(String(20), nullable=False, default="Qualified")
    remarks = Column(Text, default="")
    students = Column(JSON, nullable=False, default=list)
    file_url = Column(Text, default="")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    job = relationship("Job")


class JobReview(Base):
    """Student review for a specific job posting."""
    __tablename__ = "job_reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(
        UUID(as_uuid=False),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating = Column(Integer, nullable=False, default=5)
    review_text = Column(Text, default="")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("job_id", "student_id", name="uq_job_student_review"),
    )

    job = relationship("Job", back_populates="reviews")
    student = relationship("User", back_populates="job_reviews")