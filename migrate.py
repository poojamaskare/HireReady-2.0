"""Quick migration script – adds missing columns & tables."""
import os, sys
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text, inspect
from services.models import Base

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# 1. Create any brand-new tables (jobs, applications)
Base.metadata.create_all(bind=engine)
print("[OK] create_all finished (new tables created if missing)")

# 2. Check if 'role' column exists in users table
insp = inspect(engine)
cols = [c["name"] for c in insp.get_columns("users")]
print(f"[INFO] Current users columns: {cols}")

if "role" not in cols:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'student'"))
    print("[OK] Added 'role' column to users table")
else:
    print("[OK] 'role' column already exists")

# 3. Add new eligibility-matching columns to users
new_user_cols = {
    "mobile_number": "VARCHAR(20) DEFAULT ''",
    "cgpa": "FLOAT",
    "certifications": "TEXT DEFAULT ''",
    "preferred_job_roles": "TEXT DEFAULT ''",
    "resume_score": "FLOAT",
    "moodle_id": "VARCHAR(8)",
    "year": "VARCHAR(4)",
    "division": "VARCHAR(1)",
    "semester": "INTEGER",
    "sgpa": "FLOAT",
    "atkt_count": "INTEGER DEFAULT 0",
    "atkt_subjects": "TEXT DEFAULT ''",
    "drop_year": "VARCHAR(3) DEFAULT 'No'",
    "internships": "JSONB",
    "projects": "JSONB",
    "core_interests": "TEXT DEFAULT ''",
    "core_skills": "TEXT DEFAULT ''",
    "github_profile": "TEXT DEFAULT ''",
    "linkedin_profile": "TEXT DEFAULT ''",
    "achievements": "TEXT DEFAULT ''",
}
for col_name, col_type in new_user_cols.items():
    if col_name not in cols:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
        print(f"[OK] Added '{col_name}' column to users table")
    else:
        print(f"[OK] '{col_name}' column already exists in users")

# 4. Add new eligibility-matching columns to jobs
job_cols = [c["name"] for c in insp.get_columns("jobs")]
print(f"[INFO] Current jobs columns: {job_cols}")
new_job_cols = {
    "job_role": "VARCHAR(255) DEFAULT ''",
    "min_cgpa": "FLOAT",
    "required_certifications": "TEXT DEFAULT ''",
    "preferred_skills": "TEXT DEFAULT ''",
}
for col_name, col_type in new_job_cols.items():
    if col_name not in job_cols:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE jobs ADD COLUMN {col_name} {col_type}"))
        print(f"[OK] Added '{col_name}' column to jobs table")
    else:
        print(f"[OK] '{col_name}' column already exists in jobs")

# 5. Verify jobs table exists
tables = insp.get_table_names()
print(f"[INFO] All tables: {tables}")
if "jobs" in tables:
    print(f"[OK] Table 'jobs' exists")
else:
    print(f"[WARN] Table 'jobs' NOT found!")

print("\nDone.")
