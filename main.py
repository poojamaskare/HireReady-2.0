from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import Optional
import joblib
import pandas as pd
import io
import logging

import json
from PyPDF2 import PdfReader
from sqlalchemy.orm.session import Session
from typing import Optional, List

from services.role_engine import rank_roles
from services.feature_analyzer import build_complete_feature_vector
from services.database import engine, get_db, Base
from services.models import User, AnalysisResult, QuizResult, Job, TpoLogin
from services.quiz_generator import generate_quiz_questions
from services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_student,
    get_current_tpo,
)

logger = logging.getLogger(__name__)

# ── Create database tables on startup ─────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Load ML model & columns ──────────────────────────────────────────────────
model = joblib.load("readiness_model.pkl")
feature_columns = joblib.load("feature_columns.pkl")

app = FastAPI()

# Paths for serving the built frontend
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
FRONTEND_INDEX = FRONTEND_DIST / "index.html"
FRONTEND_ASSETS = FRONTEND_DIST / "assets"

# Allow CORS for the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount built asset folder if present
if FRONTEND_ASSETS.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS), name="assets")
else:
    # Optional fallback: serve public assets if dist not built yet
    PUBLIC_DIR = BASE_DIR / "frontend" / "public"
    if PUBLIC_DIR.exists():
        app.mount("/assets", StaticFiles(directory=PUBLIC_DIR), name="assets")


@app.get("/", response_class=HTMLResponse)
async def serve_root(request: Request):
    """Serve the built HireReady frontend."""
    index_path = FRONTEND_INDEX if FRONTEND_INDEX.exists() else BASE_DIR / "frontend" / "index.html"
    if not index_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Frontend build not found. Run 'npm install' then 'npm run build' inside frontend/.",
        )
    return FileResponse(index_path)
    
@app.get("/vite.svg")
async def serve_vite_svg():
    svg_path = FRONTEND_DIST / "vite.svg"
    if not svg_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="vite.svg not found. Build frontend.")
    return FileResponse(svg_path)


@app.get("/api/ping")
def ping():
    """Simple health endpoint for the UI button."""
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"  # "student" or "tpo"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/api/auth/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new account. Students → users table, TPOs → TPO_login table."""
    email = data.email.strip().lower()
    role = data.role.strip().lower()
    if role not in ("student", "tpo"):
        raise HTTPException(status_code=400, detail="Role must be 'student' or 'tpo'.")

    # ── TPO Registration → TPO_login table ────────────────────────────────
    if role == "tpo":
        existing_tpo = db.query(TpoLogin).filter(TpoLogin.email == email).first()
        if existing_tpo:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A TPO account with this email already exists.",
            )

        tpo = TpoLogin(
            email=email,
            password=hash_password(data.password),
        )
        db.add(tpo)
        db.commit()

        import uuid as _uuid
        tpo_uuid = str(_uuid.uuid5(_uuid.NAMESPACE_DNS, email))
        token = create_access_token(email, role="tpo")

        return {
            "token": token,
            "user": {
                "id": tpo_uuid,
                "name": data.name.strip(),
                "email": tpo.email,
                "role": "tpo",
            },
        }

    # ── Student Registration → users table ────────────────────────────────
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role="student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id), role="student")

    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "github_username": user.github_username or "",
            "leetcode_username": user.leetcode_username or "",
            "resume_filename": user.resume_filename or "",
            "mobile_number": user.mobile_number or "",
            "cgpa": user.cgpa,
            "certifications": user.certifications or "",
            "preferred_job_roles": user.preferred_job_roles or "",
        },
    }


@app.post("/api/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate. Checks TPO_login first, then users table."""
    email = data.email.strip().lower()

    # ── Try TPO_login table first ─────────────────────────────────────────
    tpo = db.query(TpoLogin).filter(TpoLogin.email == email).first()
    if tpo:
        if not verify_password(data.password, tpo.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )
        import uuid as _uuid
        tpo_uuid = str(_uuid.uuid5(_uuid.NAMESPACE_DNS, tpo.email))
        token = create_access_token(tpo.email, role="tpo")
        return {
            "token": token,
            "user": {
                "id": tpo_uuid,
                "name": tpo.email,
                "email": tpo.email,
                "role": "tpo",
            },
        }

    # ── Fall back to users (student) table ────────────────────────────────
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(str(user.id), role=user.role)

    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "github_username": user.github_username or "",
            "leetcode_username": user.leetcode_username or "",
            "resume_filename": user.resume_filename or "",
            "mobile_number": user.mobile_number or "",
            "cgpa": user.cgpa,
            "certifications": user.certifications or "",
            "preferred_job_roles": user.preferred_job_roles or "",
        },
    }


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Return the current user's profile."""
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "github_username": current_user.github_username or "",
        "leetcode_username": current_user.leetcode_username or "",
        "resume_filename": current_user.resume_filename or "",
        "mobile_number": current_user.mobile_number or "",
        "cgpa": current_user.cgpa,
        "certifications": current_user.certifications or "",
        "preferred_job_roles": current_user.preferred_job_roles or "",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER: Analysis Pipeline
# ═══════════════════════════════════════════════════════════════════════════════

def run_analysis_pipeline(
    user: User,
    db: Session,
    resume_text: str = "",
    github_username: str = "",
    leetcode_username: str = "",
):
    """
    Core logic to extract features, run model, and save result.
    call this whenever profile details change.
    """
    # If no resume text provided, try to use saved
    if not resume_text:
        resume_text = user.resume_text or ""
    
    # If no usernames provided, use saved
    if not github_username:
        github_username = user.github_username or ""
    if not leetcode_username:
        leetcode_username = user.leetcode_username or ""

    # 1. Extract feature vector
    feature_vector = build_complete_feature_vector(
        resume_text=resume_text,
        github_username=github_username,
        leetcode_username=leetcode_username,
    )

    # 2. Run readiness prediction
    df = pd.DataFrame([feature_vector])
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0
    df = df[feature_columns]

    raw_score = float(model.predict(df)[0])

    # 3. Calibrate score
    MODEL_MIN = 6.0
    MODEL_MAX = 80.0
    readiness = ((raw_score - MODEL_MIN) / (MODEL_MAX - MODEL_MIN)) * 100
    readiness = max(0, min(100, readiness))
    readiness = round(readiness, 2)

    # 4. Categorise
    if readiness >= 75:
        category = "Placement Ready"
    elif readiness >= 50:
        category = "Almost Ready"
    else:
        category = "Needs Improvement"

    # 5. Role ranking
    top_roles = rank_roles(feature_vector, top_k=3)
    role_list = [{"role": role, "score": round(score, 4)} for role, score in top_roles]

    # 6. Calculate category-specific scores (scale 0-10)
    def calculate_category_scores(fvec, u):
        missing_info = {
            "edu": [], "skill": [], "contact": [], "intern": [], "exp": [], "proj": []
        }
        
        # Education: Scale CGPA to 10
        edu = min(10.0, (u.cgpa or 0.0))
        if not u.cgpa:
            missing_info["edu"].append("CGPA not found in profile")
        elif u.cgpa < 8.0:
            missing_info["edu"].append("CGPA is below 8.0")
        
        # Skills: 20+ detected skills = 10/10
        skill_keys = [
            "Python", "Java", "C++", "JavaScript", "SQL", "Node", "React", "NextJS",
            "Docker", "Kubernetes", "CI/CD", "AWS", "NLP", "LLM", "SystemDesign", "DBMS"
        ]
        detected_skills = [k for k in skill_keys if fvec.get(k, 0) > 0]
        skill_score = min(10.0, len(detected_skills) / 1.5) # Roughly 15 skills for 10/10
        
        missing_skills = [k for k in skill_keys if k not in detected_skills]
        if len(detected_skills) < 10:
            missing_info["skill"].extend(missing_skills[:3])
        
        # Contact: Name, Email (always present), Mobile, Github
        contact = 5.0 # baseline for registered user
        if u.mobile_number: 
            contact += 2.5
        else:
            missing_info["contact"].append("Mobile Number")
            
        if u.github_username: 
            contact += 2.5
        else:
            missing_info["contact"].append("GitHub Link")
        
        # Internships: 1=5, 2=8, 3+=10
        intern_keys = ["internship_backend", "internship_ai", "internship_cloud", "internship_security", "internship_mobile", "internship_data"]
        intern_count = sum(1 for k in intern_keys if fvec.get(k, 0) > 0)
        intern_score = 10.0 if intern_count >= 3 else (8.0 if intern_count == 2 else (5.0 if intern_count == 1 else 0.0))
        
        if intern_count == 0:
            missing_info["intern"].append("Relevant Internship")
        elif intern_count < 2:
            missing_info["intern"].append("Second Internship")
        
        # Projects: 5+ projects = 10/10
        proj_keys = ["num_backend_projects", "num_ai_projects", "num_mobile_projects", "num_cloud_projects", "num_security_projects"]
        proj_count = sum(fvec.get(k, 0) for k in proj_keys)
        # Cap count from individual domains to avoid single-domain bloating
        effective_proj_count = sum(min(fvec.get(k, 0), 2) for k in proj_keys)
        proj_score = min(10.0, effective_proj_count * 2.5)
        
        if proj_count < 3:
            missing_info["proj"].append(f"At least {3 - proj_count} more projects")
        
        # Experience: Weighted average of projects and internships for now
        exp_score = (intern_score * 0.6) + (proj_score * 0.4)
        if exp_score < 7:
            missing_info["exp"].append("More hands-on industry experience")
        
        return {
            "edu": round(edu, 1),
            "skill": round(skill_score, 1),
            "contact": round(contact, 1),
            "intern": round(intern_score, 1),
            "exp": round(exp_score, 1),
            "proj": round(proj_score, 1),
            "skills_list": detected_skills,
            "missing": missing_info
        }

    cat_scores = calculate_category_scores(feature_vector, user)

    # 7. Generate AI Suggestions
    from services.suggestion_engine import generate_suggestions
    ai_suggestions = generate_suggestions(
        readiness_score=readiness,
        features=feature_vector,
        categories_scores=cat_scores,
        resume_text=resume_text
    )

    # 8. Save result
    try:
        analysis = AnalysisResult(
            user_id=user.id,
            resume_text_preview=resume_text[:200] if resume_text else "",
            github_username=github_username,
            leetcode_username=leetcode_username,
            features=json.dumps(feature_vector) if isinstance(feature_vector, dict) else feature_vector,
            readiness_score=readiness,
            readiness_category=category,
            recommended_roles=role_list,
            # Re-assigned scores
            education_score=cat_scores["edu"],
            skills_score=cat_scores["skill"],
            contact_score=cat_scores["contact"],
            internship_score=cat_scores["intern"],
            experience_score=cat_scores["exp"],
            project_score=cat_scores["proj"],
            ai_suggestions=ai_suggestions,
            missing_details=cat_scores.get("missing", {})
        )
        db.add(analysis)

        # Store resume_score on user for shortlisting
        user.resume_score = readiness

        db.commit()
        db.refresh(analysis)
        logger.info("Auto-analysis saved: %s", analysis.id)
        return analysis
    except Exception as exc:
        logger.error("Failed to save analysis: %s", exc)
        db.rollback()
        return None

# ═══════════════════════════════════════════════════════════════════════════════
# PROFILE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.put("/api/auth/profile")
async def update_profile(
    name: Optional[str] = Form(None),
    github_username: Optional[str] = Form(None),
    leetcode_username: Optional[str] = Form(None),
    mobile_number: Optional[str] = Form(None),
    cgpa: Optional[str] = Form(None),
    certifications: Optional[str] = Form(None),
    preferred_job_roles: Optional[str] = Form(None),
    resume: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile details."""
    new_resume_text = None

    if name is not None:
        current_user.name = name.strip()
    
    if github_username is not None:
        current_user.github_username = github_username.strip()

    if leetcode_username is not None:
        current_user.leetcode_username = leetcode_username.strip()

    if mobile_number is not None:
        current_user.mobile_number = mobile_number.strip()

    if cgpa is not None and cgpa.strip():
        try:
            current_user.cgpa = float(cgpa.strip())
        except ValueError:
            pass

    if certifications is not None:
        current_user.certifications = certifications.strip()

    if preferred_job_roles is not None:
        current_user.preferred_job_roles = preferred_job_roles.strip()

    # Handle resume upload
    if resume and resume.filename:
        try:
            filename = resume.filename
            pdf_bytes = await resume.read() # Use await for async file read
            
            # Extract text using PyPDF2
            reader = PdfReader(io.BytesIO(pdf_bytes))
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            
            # Save strictly necessary fields
            current_user.resume_filename = filename
            current_user.resume_text = text  # Store text for analysis
            
            new_resume_text = text
            logger.info("Updated resume for user %s: %s", current_user.email, filename)
        except Exception as e:
            logger.error("Failed to process resume upload: %s", e)
            raise HTTPException(status_code=400, detail="Invalid PDF file")

    db.commit()
    db.refresh(current_user)

    # 3. Trigger Auto-Analysis
    # We pass the NEW text if uploaded, otherwise None (helper uses saved)
    latest_analysis = run_analysis_pipeline(
        user=current_user,
        db=db,
        resume_text=new_resume_text if new_resume_text else None,
        # Helper will fetch saved usernames from User object
    )

    return {
        "user": {
            "id": str(current_user.id),
            "name": current_user.name,
            "resume_filename": current_user.resume_filename,
            "email": current_user.email,
            "github_username": current_user.github_username,
            "leetcode_username": current_user.leetcode_username,
            "mobile_number": current_user.mobile_number or "",
            "cgpa": current_user.cgpa,
            "certifications": current_user.certifications or "",
            "preferred_job_roles": current_user.preferred_job_roles or "",
        },
        "analysis": {
            "status": "success",
            "readiness_score": latest_analysis.readiness_score,
            "readiness_category": latest_analysis.readiness_category,
            "recommended_roles": latest_analysis.recommended_roles,
            "education_score": latest_analysis.education_score,
            "skills_score": latest_analysis.skills_score,
            "contact_score": latest_analysis.contact_score,
            "internship_score": latest_analysis.internship_score,
            "experience_score": latest_analysis.experience_score,
            "project_score": latest_analysis.project_score,
            "ai_suggestions": latest_analysis.ai_suggestions,
            "missing_details": latest_analysis.missing_details,
            "total_features_used": len([v for v in (json.loads(latest_analysis.features).values() if isinstance(latest_analysis.features, str) else latest_analysis.features.values() if latest_analysis.features else {}) if v > 0]),
            "created_at": latest_analysis.created_at
        } if latest_analysis else None
    }


@app.get("/api/analysis/latest")
def get_latest_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the most recent analysis result for the user."""
    # TPOs don't have analysis results
    if current_user.role == "tpo":
        return {"status": "no_analysis"}

    # Query AnalysisResult table
    latest = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.user_id == current_user.id)
        .order_by(AnalysisResult.created_at.desc())
        .first()
    )

    if not latest:
        return {"status": "no_analysis"}

    return {
        "status": "success",
        "readiness_score": latest.readiness_score,
        "readiness_category": latest.readiness_category,
        "recommended_roles": latest.recommended_roles,
        "education_score": latest.education_score,
        "skills_score": latest.skills_score,
        "contact_score": latest.contact_score,
        "internship_score": latest.internship_score,
        "experience_score": latest.experience_score,
        "project_score": latest.project_score,
        "ai_suggestions": latest.ai_suggestions,
        "missing_details": latest.missing_details,
        "total_features_used": len([v for v in (json.loads(latest.features).values() if isinstance(latest.features, str) else latest.features.values() if latest.features else {}) if v > 0]),
        "created_at": latest.created_at
    }


# NOTE: analyze-full-profile is now deprecated/redundant effectively,
# but can be kept as a direct tool if needed. 



# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class StudentFeatures(BaseModel):
    features: dict


class FeatureExtractionRequest(BaseModel):
    resume_text: str = ""
    github_username: str = ""
    leetcode_username: str = ""


@app.post("/api/extract-features")
def extract_features(data: FeatureExtractionRequest):
    """
    Extract a 64-feature dictionary from resume text, GitHub profile,
    and LeetCode profile. The output is directly usable as input to
    the /analyze-student endpoint.
    """
    feature_vector = build_complete_feature_vector(
        resume_text=data.resume_text,
        github_username=data.github_username,
        leetcode_username=data.leetcode_username,
    )
    return {"features": feature_vector}


@app.post("/api/analyze-full-profile")
async def analyze_full_profile(
    resume: Optional[UploadFile] = File(None),
    github_username: str = Form(""),
    leetcode_username: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    All-in-one endpoint: accepts a PDF resume + usernames via
    multipart/form-data, extracts features, runs the readiness model,
    saves the result to Supabase, and returns a combined response.

    If no resume is uploaded, uses the previously saved resume.
    Requires JWT authentication.
    """
    # ── 1. Extract text from uploaded PDF (or use saved) ──────────────
    resume_text = ""
    resume_filename = ""
    if resume and resume.filename:
        resume_filename = resume.filename
        try:
            contents = await resume.read()
            reader = PdfReader(io.BytesIO(contents))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    resume_text += page_text + "\n"
        except Exception as exc:
            logger.error("Failed to parse uploaded PDF: %s", exc)
    elif current_user.resume_text:
        # Fall back to saved resume
        resume_text = current_user.resume_text
        resume_filename = current_user.resume_filename or "saved_resume.pdf"

    # ── 2. Extract feature vector ─────────────────────────────────────
    feature_vector = build_complete_feature_vector(
        resume_text=resume_text,
        github_username=github_username.strip(),
        leetcode_username=leetcode_username.strip(),
    )

    # ── 3. Run readiness prediction ───────────────────────────────────
    df = pd.DataFrame([feature_vector])
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0
    df = df[feature_columns]

    raw_score = float(model.predict(df)[0])

    # ── 3b. Calibrate score ──────────────────────────────────────────
    # The XGBoost model outputs in a compressed range (~6 to ~80).
    # Normalize to a 0-100 scale for user-friendly display.
    MODEL_MIN = 6.0    # model output when all features = 0
    MODEL_MAX = 80.0   # model output when all features maxed
    readiness = ((raw_score - MODEL_MIN) / (MODEL_MAX - MODEL_MIN)) * 100
    readiness = max(0, min(100, readiness))  # clamp to 0-100
    readiness = round(readiness, 2)

    # ── 4. Categorise readiness ───────────────────────────────────────
    if readiness >= 75:
        category = "Placement Ready"
    elif readiness >= 50:
        category = "Almost Ready"
    else:
        category = "Needs Improvement"

    # ── 5. Role ranking ───────────────────────────────────────────────
    top_roles = rank_roles(feature_vector, top_k=3)
    role_list = [{"role": role, "score": round(score, 4)} for role, score in top_roles]

    # ── 6. Save result to Supabase ────────────────────────────────────
    try:
        analysis = AnalysisResult(
            user_id=current_user.id,
            resume_text_preview=resume_text[:200] if resume_text else "",
            github_username=github_username.strip(),
            leetcode_username=leetcode_username.strip(),
            features=feature_vector,
            readiness_score=readiness,
            readiness_category=category,
            recommended_roles=role_list,
        )
        db.add(analysis)

        # Auto-save usernames and resume to user profile
        if github_username.strip() and not current_user.github_username:
            current_user.github_username = github_username.strip()
        if leetcode_username.strip() and not current_user.leetcode_username:
            current_user.leetcode_username = leetcode_username.strip()
        if resume_text and resume_filename:
            current_user.resume_text = resume_text
            current_user.resume_filename = resume_filename

        db.commit()
        logger.info("Saved analysis result %s for user %s", analysis.id, current_user.id)
    except Exception as exc:
        logger.error("Failed to save analysis result: %s", exc)
        db.rollback()
        # Don't crash — still return the result to the user

    # ── Debug: Print non-zero features for user visibility ────────────────
    non_zero_features = {k: v for k, v in feature_vector.items() if v > 0}
    print("\n════════════════════════════════════════════════════════════════")
    print(f" ANALYSIS RESULT FOR: {current_user.name}")
    print(f" ----------------------------------------------------------------")
    print(f" READINESS SCORE: {readiness}")
    print(f" DETECTED FEATURES: {len(non_zero_features)}")
    print(f" NON-ZERO VALUES: {non_zero_features}")
    print("════════════════════════════════════════════════════════════════\n")

    return {
        "readiness_score": readiness,
        "readiness_category": category,
        "recommended_roles": role_list,
        "total_features_used": len(non_zero_features),
        "features": non_zero_features,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HISTORY ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/history")
@app.get("/api/history")
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's past analysis results, newest first."""
    results = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.user_id == current_user.id)
        .order_by(AnalysisResult.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "id": str(r.id),
            "github_username": r.github_username,
            "leetcode_username": r.leetcode_username,
            "readiness_score": r.readiness_score,
            "readiness_category": r.readiness_category,
            "recommended_roles": r.recommended_roles,
            "education_score": r.education_score,
            "skills_score": r.skills_score,
            "contact_score": r.contact_score,
            "internship_score": r.internship_score,
            "experience_score": r.experience_score,
            "project_score": r.project_score,
            "ai_suggestions": r.ai_suggestions,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in results
    ]


@app.post("/analyze-student")
@app.post("/api/analyze-student")
def analyze_student(data: StudentFeatures):

    # Convert input dict to dataframe
    df = pd.DataFrame([data.features])

    # Ensure all expected columns exist
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0

    df = df[feature_columns]

    # 1️⃣ Readiness Prediction (with calibration)
    raw_score = float(model.predict(df)[0])
    MODEL_MIN = 6.0
    MODEL_MAX = 80.0
    readiness = ((raw_score - MODEL_MIN) / (MODEL_MAX - MODEL_MIN)) * 100
    readiness = max(0, min(100, readiness))

    # 2️⃣ Role Ranking
    top_roles = rank_roles(data.features)

    return {
        "readiness_score": round(readiness, 2),
        "recommended_roles": top_roles
    }


# ═══════════════════════════════════════════════════════════════════════════════
# QUIZ ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class QuizGenerateRequest(BaseModel):
    role: str
    difficulty: str
    resultId: Optional[str] = None

class QuizSubmitRequest(BaseModel):
    role: str
    difficulty: str
    score: int
    totalQuestions: int
    questions: list # Array of stored question objects
    answers: list # List of objects
    resultId: Optional[str] = None

@app.post("/quiz/generate")
@app.post("/api/quiz/generate")
def generate_quiz_endpoint(
    data: QuizGenerateRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if data.resultId:
            # Retest scenario: fetch the exact previous questions
            result = db.query(QuizResult).filter(
                QuizResult.id == data.resultId,
                QuizResult.user_id == current_user.id
            ).first()
            if result and result.questions:
                return {"questions": result.questions}
                
        # New quiz scenario: generate fresh questions
        questions = generate_quiz_questions(data.role, data.difficulty)
        return {"questions": questions}
    except ValueError as e:
        logger.error("Quiz generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Quiz generation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

@app.post("/quiz/submit")
@app.post("/api/quiz/submit")
def submit_quiz_endpoint(
    data: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check if result_id is provided for retest (updates existing result)
        if data.resultId:
            result = db.query(QuizResult).filter(
                QuizResult.id == data.resultId, 
                QuizResult.user_id == current_user.id
            ).first()
            
            if result:
                result.role = data.role
                result.difficulty = data.difficulty
                result.score = data.score
                result.total_questions = data.totalQuestions
                result.questions = data.questions if data.questions else result.questions
                result.answers = data.answers
                # created_at remains the same, or we could update a updated_at field
                db.commit()
                db.refresh(result)
                return {"message": "Quiz result updated successfully", "resultId": str(result.id)}
        
        # New submission
        result = QuizResult(
            user_id=current_user.id,
            role=data.role,
            difficulty=data.difficulty,
            score=data.score,
            total_questions=data.totalQuestions,
            questions=data.questions,
            answers=data.answers
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return {"message": "Quiz submitted successfully", "resultId": str(result.id)}
    except Exception as e:
        logger.error("Quiz submit failed: %s", e)
        # db.rollback() # Handled by session usually but good practice
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quiz/results")
@app.get("/api/quiz/results")
def get_quiz_results(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = db.query(QuizResult).filter(QuizResult.user_id == current_user.id).order_by(QuizResult.created_at.desc()).all()
    return {"results": results}

@app.get("/quiz/roles")
@app.get("/api/quiz/roles")
def get_quiz_roles(current_user: User = Depends(get_current_user)):
     roles = [
        'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
        'ML Engineer', 'Data Scientist', 'Data Engineer',
        'Java Developer', 'Python Developer', 'DevOps Engineer',
        'Cloud Engineer', 'Mobile Developer', 'iOS Developer',
        'Android Developer', 'QA / Test Engineer', 'Cybersecurity Analyst',
        'AI Research Engineer', 'Game Developer', 'Blockchain Developer',
        'Database Administrator', 'Systems Engineer', 'UI/UX Designer',
    ]
     return {"roles": roles}


# ══════════════════════════════════════════════════════════════════════════════
# TPO  —  Job-posting & applicant management
# ══════════════════════════════════════════════════════════════════════════════

class JobCreateRequest(BaseModel):
    title: str
    company: str
    description: str = ""
    eligibility: str = ""
    job_role: str = ""
    min_cgpa: Optional[float] = None
    required_certifications: str = ""
    preferred_skills: str = ""
    package_lpa: Optional[float] = None
    deadline: str = ""


@app.post("/api/tpo/jobs")
def create_job(
    body: JobCreateRequest,
    tpo: User = Depends(get_current_tpo),
    db: Session = Depends(get_db),
):
    """TPO creates a new job posting."""
    job = Job(
        posted_by=tpo.id,
        title=body.title,
        company=body.company,
        description=body.description,
        eligibility=body.eligibility,
        job_role=body.job_role,
        min_cgpa=body.min_cgpa,
        required_certifications=body.required_certifications,
        preferred_skills=body.preferred_skills,
        package_lpa=body.package_lpa,
        deadline=body.deadline,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {
        "id": str(job.id),
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "eligibility": job.eligibility,
        "job_role": job.job_role,
        "min_cgpa": job.min_cgpa,
        "required_certifications": job.required_certifications,
        "preferred_skills": job.preferred_skills,
        "package_lpa": job.package_lpa,
        "deadline": job.deadline,
        "created_at": str(job.created_at),
    }


@app.get("/api/tpo/jobs")
def list_tpo_jobs(
    tpo: User = Depends(get_current_tpo),
    db: Session = Depends(get_db),
):
    """List all jobs posted by this TPO."""
    jobs = (
        db.query(Job)
        .filter(Job.posted_by == tpo.id)
        .order_by(Job.created_at.desc())
        .all()
    )
    return {
        "jobs": [
            {
                "id": str(j.id),
                "title": j.title,
                "company": j.company,
                "description": j.description,
                "eligibility": j.eligibility,
                "job_role": j.job_role or "",
                "min_cgpa": j.min_cgpa,
                "required_certifications": j.required_certifications or "",
                "preferred_skills": j.preferred_skills or "",
                "package_lpa": j.package_lpa,
                "deadline": j.deadline,
                "created_at": str(j.created_at),
            }
            for j in jobs
        ]
    }


@app.delete("/api/tpo/jobs/{job_id}")
def delete_job(
    job_id: str,
    tpo: User = Depends(get_current_tpo),
    db: Session = Depends(get_db),
):
    """TPO deletes one of their own job postings."""
    job = db.query(Job).filter(Job.id == job_id, Job.posted_by == tpo.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"detail": "Job deleted"}


@app.get("/api/tpo/jobs/{job_id}/shortlisted")
def get_shortlisted_students(
    job_id: str,
    tpo: User = Depends(get_current_tpo),
    db: Session = Depends(get_db),
):
    """
    Auto-shortlist students for a job based on CGPA, certifications,
    resume_score, and preferred_skills match.
    
    Filters:
      - cgpa >= job.min_cgpa
      - All required_certifications matched
      - resume_score >= 60
      
    Score = (skill_match + cgpa_score + resume_score/100) / 3
    """
    job = db.query(Job).filter(Job.id == job_id, Job.posted_by == tpo.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Parse required certifications (lowercased, trimmed)
    req_certs = [
        c.strip().lower()
        for c in (job.required_certifications or "").split(",")
        if c.strip()
    ]

    # Parse preferred skills (lowercased, trimmed)
    pref_skills = [
        s.strip().lower()
        for s in (job.preferred_skills or "").split(",")
        if s.strip()
    ]

    # Fetch all students
    students = db.query(User).filter(User.role == "student").all()

    shortlisted = []
    for s in students:
        # --- CGPA filter ---
        if job.min_cgpa is not None and job.min_cgpa > 0:
            if s.cgpa is None or s.cgpa < job.min_cgpa:
                continue

        # --- Certification filter ---
        student_certs = [
            c.strip().lower()
            for c in (s.certifications or "").split(",")
            if c.strip()
        ]
        if req_certs:
            matched_certs = [rc for rc in req_certs if rc in student_certs]
            if len(matched_certs) < len(req_certs):
                continue  # student missing required certs
        else:
            matched_certs = []

        # --- Resume score filter (>= 50) ---
        resume_sc = s.resume_score or 0
        if resume_sc < 50:
            continue

        # --- Skill match ---
        # Check student's resume_text + certifications + preferred_job_roles for skills
        student_text = " ".join([
            (s.resume_text or "").lower(),
            (s.certifications or "").lower(),
            (s.preferred_job_roles or "").lower(),
        ])
        if pref_skills:
            matched_skills = [sk for sk in pref_skills if sk in student_text]
            skill_match = len(matched_skills) / len(pref_skills)
        else:
            matched_skills = []
            skill_match = 1.0  # no skills required = full match

        # --- Calculate match score ---
        cgpa_score = min((s.cgpa or 0) / 10.0, 1.0)
        match_score = round(((skill_match + cgpa_score + resume_sc / 100) / 3) * 100, 2)

        shortlisted.append({
            "student": {
                "id": str(s.id),
                "name": s.name,
                "email": s.email,
                "mobile_number": s.mobile_number or "",
                "cgpa": s.cgpa,
                "certifications": s.certifications or "",
                "preferred_job_roles": s.preferred_job_roles or "",
                "resume_text": s.resume_text or "",
                "resume_score": resume_sc,
            },
            "match_score": match_score,
            "matched_skills": matched_skills,
            "matched_certifications": matched_certs,
        })

    # Sort by match_score descending
    shortlisted.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "job": {
            "id": str(job.id),
            "title": job.title,
            "company": job.company,
            "min_cgpa": job.min_cgpa,
            "required_certifications": job.required_certifications or "",
            "preferred_skills": job.preferred_skills or "",
            "job_role": job.job_role or "",
        },
        "shortlisted_students": shortlisted,
        "total": len(shortlisted),
    }


# ══════════════════════════════════════════════════════════════════════════════
# Students  —  Browse & apply to jobs
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/jobs")
def list_all_jobs(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Students browse all available job postings (view-only, no apply)."""
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()

    return {
        "jobs": [
            {
                "id": str(j.id),
                "title": j.title,
                "company": j.company,
                "description": j.description,
                "eligibility": j.eligibility,
                "job_role": j.job_role or "",
                "min_cgpa": j.min_cgpa,
                "required_certifications": j.required_certifications or "",
                "preferred_skills": j.preferred_skills or "",
                "package_lpa": j.package_lpa,
                "deadline": j.deadline,
                "created_at": str(j.created_at),
            }
            for j in jobs
        ]
    }

