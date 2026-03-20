"""
Feature Extraction Analyzer for HireReady 2.0

Extracts a strict 56-feature dictionary from resume text.
The output is used by backend readiness evaluation.

All features default to 0 if data is unavailable.
"""

import re
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. FEATURE_COLUMNS — Canonical list of every feature the model expects.
#    Total: 45 skills + 6 internships + 5 projects = 56
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
]

# Quick sanity check at import time
assert len(FEATURE_COLUMNS) == 56, (
    f"Expected 56 feature columns, got {len(FEATURE_COLUMNS)}"
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
            end = min(len(lower_text), start + 500)
            intern_context += lower_text[start:end] + " "

    for feature, patterns in _INTERNSHIP_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, intern_context):
                features[feature] = 1
                break

    # ── Project counting (integer) ───────────────────────────────────────
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
            count += len(re.findall(pattern, project_context))
        features[feature] = min(count, 10)

    return features


# ---------------------------------------------------------------------------
# 4. build_complete_feature_vector — Resume-only extraction.
# ---------------------------------------------------------------------------

def build_complete_feature_vector(
    resume_text: str,
    **_kwargs,
) -> Dict[str, int]:
    """
    Build the full 56-feature dictionary from resume text analysis.

    Any extra keyword arguments (e.g. legacy github_username,
    leetcode_username) are silently ignored for backward compatibility.
    """
    feature_vector = extract_resume_features(resume_text)

    # ── Validation ───────────────────────────────────────────────────
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
