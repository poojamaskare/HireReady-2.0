import re
import sys

path = r'c:\Users\POOJA\Documents\Hire-Ready\HireReady-2.0\services\feature_analyzer.py'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Expanded _SKILL_PATTERNS
new_patterns = """_SKILL_PATTERNS: Dict[str, list] = {
    # ── Programming languages ────────────────────────────────────────────
    "Python":            [r"\bpython\b", r"\bpy\b", r"\bpython3?\b"],
    "Java":              [r"\bjava\b(?!\s*script)"],
    "C++":               [r"\bc\+\+\b", r"\bcpp\b", r"\bc\+\+11\b", r"\bc\+\+14\b", r"\bc\+\+17\b", r"\bc\+\+20\b"],
    "C":                 [r"\bc\b(?!\+\+|#|sharp)"],
    "JavaScript":        [r"\bjavascript\b", r"\bjs\b", r"\becmascript\b", r"\bnode\b"],
    "Go":                [r"\bgolang\b", r"\bgo\b(?:\s+lang)?\b"],
    "Rust":              [r"\brust\b"],
    "TypeScript":        [r"\btypescript\b", r"\bts\b"],
    "SQL":               [r"\bsql\b", r"\bmysql\b", r"\bpostgresql\b", r"\bpostgres\b", r"\boracle\b", r"\bmongodb\b", r"\bnosql\b", r"\bsqlite\b", r"\bmssql\b", r"\bsql\s*server\b"],

    # ── Frameworks / runtimes ────────────────────────────────────────────
    "Node":              [r"\bnode\.?js\b", r"\bnode\b", r"\bruntime\b"],
    "Spring":            [r"\bspring\b(?:\s*boot)?", r"\bhibernate\b", r"\bjpa\b"],
    "Django":            [r"\bdjango\b", r"\bdjango-rest\b"],
    "Flask":             [r"\bflask\b"],
    "FastAPI":           [r"\bfastapi\b", r"\bfast\s*api\b"],
    "Express":           [r"\bexpress\.?js\b", r"\bexpress\b"],
    "React":             [r"\breact\.?js\b", r"\breact\b(?!\s*native)"],
    "Angular":           [r"\bangular\b", r"\bangularjs\b", r"\bangular\.?io\b"],
    "Vue":               [r"\bvue\.?js\b", r"\bvue\b", r"\bvuejs\b"],
    "NextJS":            [r"\bnext\.?js\b", r"\bnextjs\b"],
    "HTML":              [r"\bhtml5?\b", r"\bhtml/css\b"],
    "CSS":               [r"\bcss3?\b", r"\bsass\b", r"\bscss\b", r"\btailwind\b", r"\bbootstrap\b", r"\bstyled\s*components\b"],

    # ── ML / AI ──────────────────────────────────────────────────────────
    "TensorFlow":        [r"\btensorflow\b", r"\btf\b", r"\bkeras\b"],
    "PyTorch":           [r"\bpytorch\b", r"\btorch\b", r"\bdeep\s+learning\b"],
    "Scikit":            [r"\bscikit[\s\-]?learn\b", r"\bsklearn\b", r"\bscikit\b", r"\bxboost\b", r"\blgbm\b", r"\bcatboost\b", r"\brandom\s*forest\b", r"\bsvm\b"],
    "Pandas":            [r"\bpandas\b", r"\bnumpy\b", r"\bmatplotlib\b", r"\bseaborn\b", r"\bplotly\b", r"\bjupyter\b", r"\bscipy\b"],
    "NLP":               [r"\bnlp\b", r"\bnatural\s+language\s+processing\b", r"\bspacy\b", r"\bnltk\b", r"\btransformers\b", r"\bhugging\s*face\b", r"\bbert\b", r"\blstm\b", r"\brnn\b"],
    "ComputerVision":    [r"\bcomputer\s*vision\b", r"\bcv\b", r"\bopencv\b", r"\byolo\b", r"\bcnn\b", r"\bimage\s+processing\b", r"\bimage\s+recognition\b"],
    "LLM":               [r"\bllm\b", r"\blarge\s+language\s+model\b", r"\bgpt\b", r"\bgpt-?\d+\b", r"\bbert\b", r"\bllama\b", r"\bgenerative\s+ai\b", r"\bgenai\b", r"\blangchain\b", r"\bopenai\b", r"\bclaude\b"],
    "PromptEngineering": [r"\bprompt\s*engineering\b", r"\bprompt\s*design\b", r"\bprompting\b"],

    # ── General / Core ───────────────────────────────────────────────────
    "OOPS":             [r"\boops\b", r"\bobject[\s\-]oriented\b", r"\boop\b", r"\bdesign\s*patterns\b", r"\bpolymorphism\b", r"\binheritance\b", r"\bencapsulation\b", r"\babstraction\b"],

    # ── Cloud / DevOps ───────────────────────────────────────────────────
    "AWS":               [r"\baws\b", r"\bamazon\s+web\s+services\b", r"\bec2\b", r"\bs3\b", r"\blambda\b", r"\brds\b", r"\belastic\s*beanstalk\b", r"\biam\b", r"\bdynamodb\b"],
    "Azure":             [r"\bazure\b", r"\bazure\s+devops\b", r"\bms\s*azure\b"],
    "GCP":               [r"\bgcp\b", r"\bgoogle\s+cloud\b", r"\bgce\b", r"\bgcs\b", r"\bgoogle\s+cloud\s+platform\b"],
    "Docker":            [r"\bdocker\b", r"\bcontainer\b", r"\bdockerfile\b"],
    "Kubernetes":        [r"\bkubernetes\b", r"\bk8s\b", r"\bhelm\b", r"\bkustomize\b"],
    "CI/CD":             [r"\bci\s*/\s*cd\b", r"\bcicd\b", r"\bcontinuous\s+integration\b",
                          r"\bcontinuous\s+deployment\b", r"\bcontinuous\s+delivery\b",
                          r"\bgithub\s+actions\b", r"\bjenkins\b", r"\bcircleci\b", r"\btravis\b", r"\bgitlab\s*ci\b", r"\bazure\s*pipelines\b"],

    # ── Security ─────────────────────────────────────────────────────────
    "EthicalHacking":    [r"\bethical\s*hacking\b", r"\bpenetration\s*testing\b",
                          r"\bpen\s*test\b", r"\bkali\b", r"\bmetasploit\b", r"\bburp\b", r"\bwireshark\b"],
    "Cryptography":      [r"\bcryptography\b", r"\bcrypto\b", r"\baes\b", r"\brsa\b", r"\bsha\b", r"\bhashing\b", r"\bencryption\b"],
    "NetworkSecurity":   [r"\bnetwork\s*security\b", r"\bfirewall\b",
                          r"\bintrusion\s+detection\b", r"\bwireshark\b", r"\bnmap\b", r"\bsnort\b"],

    # ── Mobile ───────────────────────────────────────────────────────────
    "Android":           [r"\bandroid\b", r"\bkotlin\b", r"\bandroid\s*studio\b"],
    "Flutter":           [r"\bflutter\b", r"\bdart\b"],
    "ReactNative":       [r"\breact\s*native\b", r"\breact-native\b"],

    # ── CS fundamentals ──────────────────────────────────────────────────
    "SystemDesign":      [r"\bsystem\s*design\b", r"\bhld\b", r"\blld\b", r"\bscalability\b", r"\bload\s+balancer\b", r"\bdistributed\s*systems\b", r"\bmicroservices\b"],
    "DBMS":              [r"\bdbms\b", r"\bdatabase\s+management\b", r"\brdbms\b", r"\bmysql\b", r"\bmongodb\b", r"\bredis\b", r"\bpostgresql\b"],
    "OS":                [r"\boperating\s*system\b", r"\blinux\b", r"\bunix\b", r"\bwindows\b", r"\bubuntu\b", r"\bcentos\b", r"\bthreading\b", r"\bprocess\b"],
}"""

pattern = r"_SKILL_PATTERNS: Dict\[str, list\] = \{.*?^\}"
new_content = re.sub(pattern, new_patterns, content, flags=re.DOTALL | re.MULTILINE)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Successfully updated skills.")
