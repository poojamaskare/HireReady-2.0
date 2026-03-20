# HireReady 2.0

An AI-powered placement readiness evaluation platform. HireReady assesses students' technical skills, processes their resumes, and tracks GitHub/LeetCode performance to provide a comprehensive **Placement Readiness Score**, tailored role recommendations, and dynamically generated practice quizzes.

## Features

- **Automated Resume Parsing**: Upload a PDF resume and automatically extract key technical qualifications.
- **GitHub & LeetCode Integration**: Fetch and aggregate coding activity natively.
- **AI Readiness Scoring**: Uses Groq LLM evaluation over structured profile signals to generate readiness score and role recommendations.
- **Dynamic Role Quizzes**: Uses the Groq API (LLMs) to generate real-time technical quizzes tailored to specific job roles and difficulties (e.g., "Frontend Developer" on "Hard").
- **Quiz Retest System**: Users can securely re-take exact past quizzes to gauge their improvement, tracked in a PostgreSQL Supabase database.
- **Modern UI/UX**: Built with React and Vite, featuring a sleek, dark-themed glassmorphic interface.

## Tech Stack

**Frontend**
- React (Vite)
- Vanilla CSS (Glassmorphism design system)
- React Router

**Backend**
- FastAPI (Python)
- SQLAlchemy + PostgreSQL (Supabase)
- PyPDF2 (Resume parsing)
- Passlib + JWT (Authentication)

**Machine Learning / AI**
- Groq (`llama3-8b-8192` or equivalent for readiness and quiz generation)

## Project Structure

```text
Hire Ready 2.0/
├── frontend/               # React (Vite) User Interface
│   ├── src/
│   │   ├── components/     # Reusable UI cards and layouts
│   │   ├── pages/          # App Routes (Dashboard, QuizPage, etc.)
│   │   └── App.jsx         # Routing configuration
│   └── vite.config.js      # Proxy mapped to localhost:8000
│
├── services/               # Backend modules
│   ├── auth.py             # JWT and password hashing
│   ├── database.py         # SQLAlchemy Engine & Supabase connection
│   ├── models.py           # DB Schema for Users, AnalysisResult, QuizResult
│   ├── feature_analyzer.py # Data pipeline for Resume/GitHub metrics
│   └── quiz_generator.py   # AI prompt logic using Groq
│
├── main.py                 # FastAPI Application execution entrypoint
└── uploads/                # User-uploaded files (resumes/results)
```

## Local Development Setup

### 1. Requirements
Ensure you have the following installed:
- Node.js (v18+)
- Python (3.10+)
- A Supabase PostgreSQL instance

### 2. Environment Variables (`.env`)
Create a `.env` file in the root directory and populate it with your credentials:
```env
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/postgres

# Authentication
JWT_SECRET=your_super_secret_jwt_key

# External APIs
GITHUB_TOKEN=your_github_personal_access_token
GROQ_API_KEY=your_groq_api_key

# Password reset email (SMTP)
# Works with Gmail app password or any SMTP provider.
EMAIL_USER=your_email_username_or_address
EMAIL_PASS=your_email_password_or_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
# Optional (use true + 465 for implicit SSL providers)
SMTP_USE_SSL=false
# Optional display name or sender address
EMAIL_FROM=HireReady

# Frontend URL used in reset links
FRONTEND_BASE_URL=http://localhost:5173
```

### 3. Backend Setup
```bash
# Create a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```
The backend will run at `http://localhost:8000`.

### 4. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```
The frontend will run at `http://localhost:5173`. API requests to `/api` are automatically proxied to the FastAPI server.

## License
MIT License.
