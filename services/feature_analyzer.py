"""
Feature Extraction Analyzer for HireReady 2.0

Extracts a strict 64-feature dictionary from resume text, GitHub profile,
and LeetCode profile. The output is directly consumable by the XGBoost
readiness model.

All features default to 0 if data is unavailable or an API call fails.
The system never crashes due to external API failures.
"""

import re
import logging
from typing import Dict

import os
import requests

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. FEATURE_COLUMNS — Canonical list of every feature the ML model expects.
#    Order matches the trained model's feature_columns.pkl.
#    DO NOT add, remove, or rename any entry.
#    Total: 45 skills + 6 internships + 5 projects + 3 github + 5 leetcode = 64
# ---------------------------------------------------------------------------

FEATURE_COLUMNS = [
    # ── Skills (binary 0/1) ──────────────────────────────────────────────
    "Python", "Java", "C++", "C", "JavaScript", "Go", "Rust", "TypeScript",
    "SQL", "Node", "Spring", "Django", "Flask", "FastAPI", "Express",
    "React", "Angular", "Vue", "NextJS", "HTML", "CSS",
    "TensorFlow", "PyTorch",
    "AWS", "Azure", "GCP",
    "Docker", "Kubernetes", "CI/CD",
    "Scikit", "Pandas", "NLP", "ComputerVision", "LLM", "PromptEngineering",
    "EthicalHacking", "Cryptography", "NetworkSecurity",
    "Android", "Flutter", "ReactNative",
    "OOPS", "SystemDesign", "DBMS", "OS",

    # ── Internships (binary 0/1) ─────────────────────────────────────────
    "internship_backend", "internship_ai", "internship_cloud",
    "internship_security", "internship_mobile", "internship_data",

    # ── Project counts (integer) ─────────────────────────────────────────
    "num_backend_projects", "num_ai_projects", "num_mobile_projects",
    "num_cloud_projects", "num_security_projects",

    # ── GitHub metrics (integer) ─────────────────────────────────────────
    "github_total_repos", "github_total_commits",
    "open_source_contribution_score",

    # ── LeetCode metrics (integer) ───────────────────────────────────────
    "leetcode_easy", "leetcode_medium", "leetcode_hard",
    "leetcode_total", "leetcode_contest_rating",
]

# Quick sanity check at import time
assert len(FEATURE_COLUMNS) == 64, (
    f"Expected 64 feature columns, got {len(FEATURE_COLUMNS)}"
)


# ---------------------------------------------------------------------------
# 2. initialize_feature_vector — Baseline dict with every column set to 0.
# ---------------------------------------------------------------------------

def initialize_feature_vector() -> Dict[str, int]:
    """Return a dictionary with all FEATURE_COLUMNS initialised to 0."""
    return {col: 0 for col in FEATURE_COLUMNS}


# ---------------------------------------------------------------------------
# 3. extract_resume_features — NLP-lite keyword extraction from resume text.
# ---------------------------------------------------------------------------

# Mapping: feature name → list of regex-safe aliases (case-insensitive).
# Word-boundary anchors (\b) prevent partial matches
# (e.g. "Java" won't match inside "JavaScript").
_SKILL_PATTERNS: Dict[str, list] = {
    # ── Programming languages ────────────────────────────────────────────
    "Python":            [r"\bpython\b", r"\bpy\b"],
    "Java":              [r"\bjava\b(?!\s*script)"],
    "C++":               [r"\bc\+\+\b", r"\bcpp\b"],
    "C":                 [r"\bc\b(?!\+\+|#|sharp)"],
    "JavaScript":        [r"\bjavascript\b", r"\bjs\b", r"\becmascript\b"],
    "Go":                [r"\bgolang\b", r"\bgo\b(?:\s+lang)?\b"],
    "Rust":              [r"\brust\b"],
    "TypeScript":        [r"\btypescript\b", r"\bts\b"],
    "SQL":               [r"\bsql\b", r"\bmysql\b", r"\bpostgresql\b", r"\bpostgres\b", r"\boracle\b", r"\bmongodb\b", r"\bnosql\b"],

    # ── Frameworks / runtimes ────────────────────────────────────────────
    "Node":              [r"\bnode\.?js\b", r"\bnode\b"],
    "Spring":            [r"\bspring\b(?:\s*boot)?", r"\bhibernate\b"],
    "Django":            [r"\bdjango\b"],
    "Flask":             [r"\bflask\b"],
    "FastAPI":           [r"\bfastapi\b", r"\bfast\s*api\b"],
    "Express":           [r"\bexpress\.?js\b", r"\bexpress\b"],
    "React":             [r"\breact\.?js\b", r"\breact\b(?!\s*native)"],
    "Angular":           [r"\bangular\b"],
    "Vue":               [r"\bvue\.?js\b", r"\bvue\b"],
    "NextJS":            [r"\bnext\.?js\b", r"\bnextjs\b"],
    "HTML":              [r"\bhtml5?\b"],
    "CSS":               [r"\bcss3?\b", r"\bsass\b", r"\bscss\b", r"\btailwind\b", r"\bbootstrap\b"],

    # ── ML / AI ──────────────────────────────────────────────────────────
    "TensorFlow":        [r"\btensorflow\b", r"\btf\b", r"\bkeras\b"],
    "PyTorch":           [r"\bpytorch\b", r"\btorch\b", r"\bdeep\s+learning\b"],
    "Scikit":            [r"\bscikit[\s\-]?learn\b", r"\bsklearn\b", r"\bscikit\b", r"\bxboost\b", r"\blgbm\b", r"\bcatboost\b"],
    "Pandas":            [r"\bpandas\b", r"\bnumpy\b", r"\bmatplotlib\b", r"\bseaborn\b", r"\bplotly\b"],
    "NLP":               [r"\bnlp\b", r"\bnatural\s+language\s+processing\b", r"\bspacy\b", r"\bnltk\b", r"\btransformers\b", r"\bhugging\s*face\b", r"\bbert\b", r"\blstm\b"],
    "ComputerVision":    [r"\bcomputer\s*vision\b", r"\bcv\b", r"\bopencv\b", r"\byolo\b", r"\bcnn\b", r"\bimage\s+processing\b"],
    "LLM":               [r"\bllm\b", r"\blarge\s+language\s+model\b", r"\bgpt\b", r"\bert\b", r"\bllama\b", r"\bgenerative\s+ai\b", r"\bgenai\b", r"\blangchain\b", r"\bopenai\b"],
    "PromptEngineering": [r"\bprompt\s*engineering\b", r"\bprompt\s*design\b"],

    # ── General / Core ───────────────────────────────────────────────────
    "Git":              [r"\bgit\b", r"\bgithub\b", r"\bbitbucket\b", r"\bgitlab\b"],
    "DSA":              [r"\bdsa\b", r"\badd\b", r"\balgorithms\b", r"\bdata\s*structures\b", r"\bleetcode\b", r"\bhackerrank\b"],
    "OOPS":             [r"\boops\b", r"\bobject[\s\-]oriented\b", r"\boop\b", r"\bdesign\s*patterns\b"],

    # ── Cloud / DevOps ───────────────────────────────────────────────────
    "AWS":               [r"\baws\b", r"\bamazon\s+web\s+services\b", r"\bec2\b", r"\bs3\b", r"\blambda\b"],
    "Azure":             [r"\bazure\b"],
    "GCP":               [r"\bgcp\b", r"\bgoogle\s+cloud\b"],
    "Docker":            [r"\bdocker\b", r"\bcontainer\b"],
    "Kubernetes":        [r"\bkubernetes\b", r"\bk8s\b", r"\bhelm\b"],
    "CI/CD":             [r"\bci\s*/\s*cd\b", r"\bcicd\b", r"\bcontinuous\s+integration\b",
                          r"\bcontinuous\s+deployment\b", r"\bcontinuous\s+delivery\b",
                          r"\bgithub\s+actions\b", r"\bjenkins\b", r"\bcircleci\b", r"\btravis\b"],

    # ── Security ─────────────────────────────────────────────────────────
    "EthicalHacking":    [r"\bethical\s*hacking\b", r"\bpenetration\s*testing\b",
                          r"\bpen\s*test\b", r"\bkali\b", r"\bmetasploit\b"],
    "Cryptography":      [r"\bcryptography\b", r"\bcrypto\b", r"\baes\b", r"\brsa\b"],
    "NetworkSecurity":   [r"\bnetwork\s*security\b", r"\bfirewall\b",
                          r"\bintrusion\s+detection\b", r"\bwireshaak\b", r"\bnmap\b"],

    # ── Mobile ───────────────────────────────────────────────────────────
    "Android":           [r"\bandroid\b", r"\bkotlin\b"],
    "Flutter":           [r"\bflutter\b", r"\bdart\b"],
    "ReactNative":       [r"\breact\s*native\b"],

    # ── CS fundamentals ──────────────────────────────────────────────────
    "SystemDesign":      [r"\bsystem\s*design\b", r"\bhld\b", r"\blld\b", r"\bscalability\b", r"\bload\s+balancer\b"],
    "DBMS":              [r"\bdbms\b", r"\bdatabase\s+management\b", r"\brdbms\b", r"\bmysql\b", r"\bmongodb\b"],
    "OS":                [r"\boperating\s*system\b", r"\blinux\b", r"\bunix\b", r"\bwindows\b"],
}

# Internship domain keywords → feature column
_INTERNSHIP_PATTERNS: Dict[str, list] = {
    "internship_backend":  [r"\bbackend\b", r"\bback[\s\-]end\b", r"\bserver[\s\-]side\b",
                            r"\bfull[\s\-]?stack\b", r"\bweb\s+develop\b",
                            r"\bfrontend\b", r"\bfront[\s\-]end\b", r"\bui\s*/\s*ux\b",
                            r"\bsoftware\s+developer\s+intern\b", r"\bsoftware\s+engineer\s+intern\b"],
    "internship_ai":       [r"\bai\b", r"\bartificial\s+intelligence\b",
                            r"\bmachine\s+learning\b", r"\bml\b", r"\bdata\s+science\b",
                            r"\bdeep\s+learning\b", r"\bai\s+intern\b", r"\bml\s+intern\b"],
    "internship_cloud":    [r"\bcloud\b", r"\bdevops\b", r"\binfrastructure\b",
                            r"\bsre\b", r"\bcloud\s+intern\b", r"\bdevops\s+intern\b"],
    "internship_security": [r"\bsecurity\b", r"\bcyber\b", r"\bsoc\b", r"\bsecurity\s+intern\b"],
    "internship_mobile":   [r"\bmobile\b", r"\bandroid\b", r"\bios\b",
                            r"\bflutter\b", r"\breact\s*native\b", r"\bmobile\s+intern\b"],
    "internship_data":     [r"\bdata\s+engineer\b", r"\bdata\s+analy\b",
                            r"\betl\b", r"\bdata\s+pipeline\b",
                            r"\bbig\s*data\b", r"\bdata\s+intern\b"],
}

# Project domain keywords → feature column
_PROJECT_PATTERNS: Dict[str, list] = {
    "num_backend_projects":  [r"\bbackend\b", r"\brest\s*api\b", r"\bweb\s+app\b",
                              r"\bserver\b", r"\bmicroservice\b", r"\bcrud\b",
                              r"\bfrontend\b", r"\bfront[\s\-]end\b", r"\bwebsite\b",
                              r"\breact\b", r"\bvue\b", r"\bangular\b", r"\bfull\s*stack\b"],
    "num_ai_projects":       [r"\bmachine\s+learning\b", r"\bml\b", r"\bai\b",
                              r"\bdeep\s+learning\b", r"\bneural\s+net\b",
                              r"\bnlp\b", r"\bcomputer\s*vision\b",
                              r"\bclassifi\b", r"\bpredict\b", r"\brecommendation\b", r"\bchatbot\b"],
    "num_mobile_projects":   [r"\bmobile\s+app\b", r"\bandroid\s+app\b",
                              r"\bios\s+app\b", r"\bflutter\b",
                              r"\breact\s*native\b", r"\bhybrid\s+app\b"],
    "num_cloud_projects":    [r"\bcloud\b", r"\baws\b", r"\bazure\b", r"\bgcp\b",
                              r"\bdeployed\s+on\b", r"\bterraform\b",
                              r"\bdocker\b", r"\bkubernetes\b", r"\bserverless\b"],
    "num_security_projects": [r"\bsecurity\b", r"\bethical\s*hack\b",
                              r"\bvulnerability\b", r"\bpenetration\b",
                              r"\bcryptograph\b", r"\bencryption\b", r"\bscanner\b"],
}


def extract_resume_features(text: str) -> Dict[str, int]:
    """
    Parse resume text and return a partial feature dictionary containing
    skill flags (binary), internship domain flags (binary), and project
    counts (integer).

    Only features detected in the text are set to non-zero values;
    all others remain at their initialised 0.
    """
    features = initialize_feature_vector()

    if not text or not text.strip():
        logger.warning("Empty resume text received — returning zero vector.")
        return features

    lower_text = text.lower()

    # ── Skill detection (binary) ─────────────────────────────────────────
    for skill, patterns in _SKILL_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, lower_text):
                features[skill] = 1
                break  # one match is enough for binary flag

    # ── Internship detection (binary) ────────────────────────────────────
    # Look for "intern" with wider context (approx 200 chars around it)
    # to catch multi-line descriptions.
    intern_matches = re.finditer(r"\bintern\b", lower_text)
    intern_indices = [m.start() for m in intern_matches]
    
    intern_context = ""
    for idx in intern_indices:
        start = max(0, idx - 100)
        end = min(len(lower_text), idx + 100)
        intern_context += lower_text[start:end] + " "

    # Fallback: if "experience" section exists, treat it as internship context
    if not intern_context and "experience" in lower_text:
        exp_matches = re.finditer(r"\bexperience\b", lower_text)
        for m in exp_matches:
            start = m.end()
            end = min(len(lower_text), start + 500) # Look ahead 500 chars
            intern_context += lower_text[start:end] + " "

    for feature, patterns in _INTERNSHIP_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, intern_context):
                features[feature] = 1
                break

    # ── Project counting (integer) ───────────────────────────────────────
    # Look for "project" with wider context.
    project_matches = re.finditer(r"\bproject\b", lower_text)
    project_indices = [m.start() for m in project_matches]
    
    project_context = ""
    for idx in project_indices:
        start = max(0, idx - 100)
        end = min(len(lower_text), idx + 100)
        project_context += lower_text[start:end] + " "

    # Fallback: if "projects" header exists
    if not project_context and "projects" in lower_text:
         proj_matches = re.finditer(r"\bprojects\b", lower_text)
         for m in proj_matches:
            start = m.end()
            end = min(len(lower_text), start + 500)
            project_context += lower_text[start:end] + " "

    for feature, patterns in _PROJECT_PATTERNS.items():
        count = 0
        for pattern in patterns:
            # Count occurrences in the gathered context
            count += len(re.findall(pattern, project_context))
        
        # Cap at 10
        features[feature] = min(count, 10)

    return features


# ---------------------------------------------------------------------------
# 4. extract_github_features — Fetch public repos via GitHub REST API.
# ---------------------------------------------------------------------------

# Maps GitHub "language" field to project category columns.
_LANGUAGE_TO_CATEGORY: Dict[str, str] = {
    # Backend
    "Java":       "num_backend_projects",
    "Go":         "num_backend_projects",
    "Ruby":       "num_backend_projects",
    "PHP":        "num_backend_projects",
    "Elixir":     "num_backend_projects",
    "Scala":      "num_backend_projects",
    "Rust":       "num_backend_projects",
    "C#":         "num_backend_projects",

    # AI / ML / Data Science
    "Jupyter Notebook": "num_ai_projects",
    "R":                "num_ai_projects",

    # Mobile
    "Kotlin":     "num_mobile_projects",
    "Swift":      "num_mobile_projects",
    "Dart":       "num_mobile_projects",
    "Objective-C":"num_mobile_projects",

    # Cloud / DevOps (infrastructure-as-code languages)
    "HCL":        "num_cloud_projects",
    "Dockerfile": "num_cloud_projects",

    # Security
    "Assembly":   "num_security_projects",
}

# Languages that can belong to multiple categories depending on repo
# content — handled via repo name/description heuristics.
_AMBIGUOUS_LANGUAGES = {"Python", "JavaScript", "TypeScript", "C", "C++", "Shell"}

# Heuristics: if a repo name/description matches these, classify into
# the corresponding category even for ambiguous languages.
_REPO_HINT_PATTERNS: Dict[str, str] = {
    r"ml|machine[\s\-]?learn|deep[\s\-]?learn|neural|nlp|cv|vision|ai|tensor|torch|model":
        "num_ai_projects",
    r"mobile|android|ios|flutter|react[\s\-]?native|app":
        "num_mobile_projects",
    r"cloud|aws|azure|gcp|terraform|infra|deploy|devops|k8s|kubernetes":
        "num_cloud_projects",
    r"secur|hack|pentest|vuln|crypt|firewall":
        "num_security_projects",
}

def _clean_github_username(raw: str) -> str:
    """
    Extract a plain GitHub username from user input.
    Handles:  'AadeshhhGavhane'
              'https://github.com/AadeshhhGavhane'
              'github.com/AadeshhhGavhane'
              'http://github.com/AadeshhhGavhane/'
    """
    raw = raw.strip().rstrip("/")
    # Strip common GitHub URL prefixes
    for prefix in ["https://github.com/", "http://github.com/", "github.com/"]:
        if raw.lower().startswith(prefix):
            raw = raw[len(prefix):]
            break
    # Take only the first path segment (ignore /repos, /stars, etc.)
    return raw.split("/")[0].strip()


def _clean_leetcode_username(raw: str) -> str:
    """
    Extract a plain LeetCode username from user input.
    Handles:  'aadesh'
              'https://leetcode.com/u/aadesh/'
              'https://leetcode.com/aadesh/'
              'leetcode.com/u/aadesh'
    """
    raw = raw.strip().rstrip("/")
    # Strip common LeetCode URL prefixes
    for prefix in ["https://leetcode.com/u/", "https://leetcode.com/",
                    "http://leetcode.com/u/", "http://leetcode.com/",
                    "leetcode.com/u/", "leetcode.com/"]:
        if raw.lower().startswith(prefix):
            raw = raw[len(prefix):]
            break
    # Take only the first path segment
    return raw.split("/")[0].strip()


GITHUB_API_BASE = "https://api.github.com"


def extract_github_features(username: str) -> Dict[str, int]:
    """
    Fetch public GitHub repositories for *username* and populate:
      - github_total_repos
      - num_backend_projects, num_ai_projects, num_mobile_projects,
        num_cloud_projects, num_security_projects
      - github_total_commits  (fetched via per-repo commit counts)
      - open_source_contribution_score (weighted: repos + stars + forks)

    Returns a partial feature dict. On any API failure, returns zeros.
    """
    features = initialize_feature_vector()

    if not username or not username.strip():
        logger.info("No GitHub username provided — returning zero vector.")
        return features

    username = _clean_github_username(username)
    logger.info("GitHub: cleaned username = '%s'", username)

    try:
        repos = _fetch_all_repos(username)
    except requests.exceptions.RequestException as exc:
        logger.error("GitHub API request failed for '%s': %s", username, exc)
        return features

    features["github_total_repos"] = len(repos)

    non_fork_count = 0
    total_stars = 0
    total_forks = 0
    total_commits = 0

    for repo in repos:
        language = repo.get("language")
        name_desc = f"{repo.get('name', '')} {repo.get('description') or ''}".lower()
        is_fork = repo.get("fork", False)
        stars = repo.get("stargazers_count", 0)
        forks = repo.get("forks_count", 0)

        total_stars += stars
        total_forks += forks

        if not is_fork:
            non_fork_count += 1

        # Classify repo into project category
        if language and language in _LANGUAGE_TO_CATEGORY:
            features[_LANGUAGE_TO_CATEGORY[language]] += 1
        elif language in _AMBIGUOUS_LANGUAGES or language is None:
            classified = False
            for pattern, category in _REPO_HINT_PATTERNS.items():
                if re.search(pattern, name_desc):
                    features[category] += 1
                    classified = True
                    break
            if not classified and language in _AMBIGUOUS_LANGUAGES:
                features["num_backend_projects"] += 1

    # ── Fetch actual commit counts (top repos by activity) ───────────────
    # Sort repos by most recently pushed, take top 10 to avoid rate limits
    sorted_repos = sorted(
        repos,
        key=lambda r: r.get("pushed_at", ""),
        reverse=True,
    )[:10]

    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_repo = {
            executor.submit(_fetch_repo_commit_count, username, r.get("full_name", "")): r
            for r in sorted_repos if r.get("full_name")
        }
        for future in concurrent.futures.as_completed(future_to_repo):
            try:
                total_commits += future.result()
            except Exception:
                pass # Ignore individual failures

    # Extrapolate: if user has more repos, multiply proportionally
    if len(repos) > 10 and len(sorted_repos) > 0:
        avg_commits_per_repo = total_commits / len(sorted_repos)
        total_commits = int(avg_commits_per_repo * len(repos))

    features["github_total_commits"] = total_commits

    # ── Contribution score: weighted combination ─────────────────────────
    # Formula: repos + (stars * 2) + (forks * 3) + (commits / 10)
    # This gives a meaningful score that reflects actual open-source impact
    contribution_score = (
        non_fork_count
        + (total_stars * 2)
        + (total_forks * 3)
        + int(total_commits / 10)
    )
    features["open_source_contribution_score"] = contribution_score

    logger.info(
        "GitHub features for '%s': repos=%d, commits=%d, stars=%d, forks=%d, contribution_score=%d",
        username, len(repos), total_commits, total_stars, total_forks, contribution_score,
    )

    return features


def _fetch_repo_commit_count(username: str, full_name: str) -> int:
    """
    Fetch the number of commits by the user in a specific repo.
    Uses the commits API with author filter, checking just the first page
    to get total count from the Link header.
    """
    token = os.getenv("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        url = f"{GITHUB_API_BASE}/repos/{full_name}/commits"
        resp = requests.get(
            url,
            params={"author": username, "per_page": 1},
            timeout=10,
            headers=headers,
        )
        resp.raise_for_status()

        # If there's a Link header with "last" page, extract count
        link_header = resp.headers.get("Link", "")
        if "last" in link_header:
            import re as _re
            match = _re.search(r'page=(\d+)>; rel="last"', link_header)
            if match:
                return int(match.group(1))

        # Otherwise, the first page has all commits
        data = resp.json()
        return len(data)

    except Exception as exc:
        logger.debug("Could not fetch commits for %s: %s", full_name, exc)
        return 0


def _fetch_all_repos(username: str, per_page: int = 100) -> list:
    """Paginate through all public repos for a GitHub user."""
    all_repos: list = []
    page = 1

    token = os.getenv("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    while True:
        url = f"{GITHUB_API_BASE}/users/{username}/repos"
        resp = requests.get(
            url,
            params={"per_page": per_page, "page": page, "type": "owner"},
            timeout=15,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

        if not data:
            break

        all_repos.extend(data)
        page += 1

        # Safety: stop after 10 pages (1 000 repos) to avoid runaway loops
        if page > 10:
            break

    return all_repos


# ---------------------------------------------------------------------------
# 5. extract_leetcode_features — Fetch stats via LeetCode GraphQL endpoint.
# ---------------------------------------------------------------------------

LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"

_LEETCODE_STATS_QUERY = """
query getUserProfile($username: String!) {
    matchedUser(username: $username) {
        submitStatsGlobal {
            acSubmissionNum {
                difficulty
                count
            }
        }
    }
    userContestRanking(username: $username) {
        rating
    }
}
"""


def extract_leetcode_features(username: str) -> Dict[str, int]:
    """
    Query the LeetCode public GraphQL API for solved-problem counts
    and contest rating.

    Sets:
      - leetcode_easy, leetcode_medium, leetcode_hard
      - leetcode_total  (= easy + medium + hard)
      - leetcode_contest_rating

    Returns a partial feature dict. On any failure, returns zeros.
    """
    features = initialize_feature_vector()

    if not username or not username.strip():
        logger.info("No LeetCode username provided — returning zero vector.")
        return features

    username = _clean_leetcode_username(username)
    logger.info("LeetCode: cleaned username = '%s'", username)

    try:
        payload = {
            "query": _LEETCODE_STATS_QUERY,
            "variables": {"username": username.strip()},
        }
        resp = requests.post(
            LEETCODE_GRAPHQL_URL,
            json=payload,
            timeout=15,
            headers={
                "Content-Type": "application/json",
                "Referer": "https://leetcode.com",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    except requests.exceptions.RequestException as exc:
        logger.error("LeetCode API request failed for '%s': %s", username, exc)
        return features

    # ── Parse submission stats ───────────────────────────────────────────
    matched_user = (data.get("data") or {}).get("matchedUser")
    if not matched_user:
        logger.warning("LeetCode user '%s' not found — returning zeros.", username)
        return features

    ac_stats = (
        matched_user
        .get("submitStatsGlobal", {})
        .get("acSubmissionNum", [])
    )

    difficulty_map = {"Easy": "leetcode_easy", "Medium": "leetcode_medium", "Hard": "leetcode_hard"}
    for entry in ac_stats:
        difficulty = entry.get("difficulty", "")
        if difficulty in difficulty_map:
            features[difficulty_map[difficulty]] = int(entry.get("count", 0))

    features["leetcode_total"] = (
        features["leetcode_easy"]
        + features["leetcode_medium"]
        + features["leetcode_hard"]
    )

    # ── Parse contest rating ─────────────────────────────────────────────
    contest_ranking = (data.get("data") or {}).get("userContestRanking")
    if contest_ranking and contest_ranking.get("rating"):
        features["leetcode_contest_rating"] = int(contest_ranking["rating"])

    return features


# ---------------------------------------------------------------------------
# 6. build_complete_feature_vector — Orchestrates all extractors.
# ---------------------------------------------------------------------------

def build_complete_feature_vector(
    resume_text: str,
    github_username: str,
    leetcode_username: str,
) -> Dict[str, int]:
    """
    Build the full 64-feature dictionary by merging results from:
      1. Resume text analysis
      2. GitHub profile analysis
      3. LeetCode profile analysis

    The final dictionary is validated against FEATURE_COLUMNS before
    being returned.

    Raises:
        ValueError: If the final dictionary does not contain exactly
                    the expected number of feature columns.
    """
    # Start with a clean zero vector
    feature_vector = initialize_feature_vector()

    # ── 1. Resume features ───────────────────────────────────────────────
    resume_features = extract_resume_features(resume_text)
    for key, value in resume_features.items():
        if key in feature_vector:
            feature_vector[key] = value

    # ── 2. GitHub features ───────────────────────────────────────────────
    github_features = extract_github_features(github_username)
    for key, value in github_features.items():
        if key in feature_vector:
            # For project counts, ADD GitHub counts on top of resume counts
            # so both sources contribute.
            if key.startswith("num_") or key.startswith("github_") or key == "open_source_contribution_score":
                feature_vector[key] += value
            else:
                # For binary skills, use OR logic (1 if either source detected it)
                feature_vector[key] = max(feature_vector[key], value)

    # ── 3. LeetCode features ────────────────────────────────────────────
    leetcode_features = extract_leetcode_features(leetcode_username)
    for key, value in leetcode_features.items():
        if key in feature_vector:
            # LeetCode features don't overlap with other sources,
            # but use max for safety.
            feature_vector[key] = max(feature_vector[key], value)

    # ── Validation ───────────────────────────────────────────────────────
    _validate_feature_vector(feature_vector)

    return feature_vector


def _validate_feature_vector(feature_vector: Dict[str, int]) -> None:
    """
    Ensure the feature vector has exactly the right keys and value types.

    Raises:
        ValueError: On schema mismatch.
    """
    expected = set(FEATURE_COLUMNS)
    actual = set(feature_vector.keys())

    missing = expected - actual
    extra = actual - expected

    if missing or extra:
        raise ValueError(
            f"Feature vector schema mismatch. "
            f"Missing columns: {missing or 'none'}. "
            f"Extra columns: {extra or 'none'}."
        )

    if len(feature_vector) != len(FEATURE_COLUMNS):
        raise ValueError(
            f"Expected {len(FEATURE_COLUMNS)} features, "
            f"got {len(feature_vector)}."
        )

    # Ensure all values are integers
    for key, value in feature_vector.items():
        if not isinstance(value, int):
            raise ValueError(
                f"Feature '{key}' has non-integer value: {value!r} "
                f"(type={type(value).__name__})"
            )
