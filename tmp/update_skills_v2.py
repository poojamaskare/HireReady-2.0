import sys
import os

path = r'c:\Users\POOJA\Documents\Hire-Ready\HireReady-2.0\services\feature_analyzer.py'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '_SKILL_PATTERNS: Dict[str, list] = {' in line:
        start_idx = i
    if start_idx != -1 and line.strip() == '}':
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_patterns = [
        '_SKILL_PATTERNS: Dict[str, list] = {\n',
        '    # ── Programming languages ────────────────────────────────────────────\n',
        '    "Python":            [r"\\bpython\\b", r"\\bpy\\b", r"\\bpython3?\\b"],\n',
        '    "Java":              [r"\\bjava\\b(?!\\s*script)"],\n',
        '    "C++":               [r"\\bc\\+\\+\\b", r"\\bcpp\\b", r"\\bc\\+\\+11\\b", r"\\bc\\+\\+14\\b", r"\\bc\\+\\+17\\b", r"\\bc\\+\\+20\\b"],\n',
        '    "C":                 [r"\\bc\\b(?!\\+\\+|#|sharp)"],\n',
        '    "JavaScript":        [r"\\bjavascript\\b", r"\\bjs\\b", r"\\becmascript\\b", r"\bnode\b"],\n',
        '    "Go":                [r"\\bgolang\\b", r"\\bgo\\b(?:\\s+lang)?\\b"],\n',
        '    "Rust":              [r"\\brust\\b"],\n',
        '    "TypeScript":        [r"\\btypescript\\b", r"\\bts\\b"],\n',
        '    "SQL":               [r"\\bsql\\b", r"\\bmysql\\b", r"\\bpostgresql\\b", r"\\bpostgres\\b", r"\\boracle\\b", r"\\bmongodb\\b", r"\\bnosql\\b", r"\\bsqlite\\b", r"\\bmssql\\b", r"\\bsql\\s*server\\b"],\n',
        '\n',
        '    # ── Frameworks / runtimes ────────────────────────────────────────────\n',
        '    "Node":              [r"\\bnode\\.?js\\b", r"\\bnode\\b", r"\\bruntime\\b"],\n',
        '    "Spring":            [r"\\bspring\\b(?:\\s*boot)?", r"\\bhibernate\\b", r"\\bjpa\\b"],\n',
        '    "Django":            [r"\\bdjango\\b", r"\\bdjango-rest\\b"],\n',
        '    "Flask":             [r"\\bflask\\b"],\n',
        '    "FastAPI":           [r"\\bfastapi\\b", r"\\bfast\\s*api\\b"],\n',
        '    "Express":           [r"\\bexpress\\.?js\\b", r"\\bexpress\\b"],\n',
        '    "React":             [r"\\breact\\.?js\\b", r"\\breact\\b(?!\\s*native)"],\n',
        '    "Angular":           [r"\\bangular\\b", r"\\bangularjs\\b", r"\\bangular\\.?io\\b"],\n',
        '    "Vue":               [r"\\bvue\\.?js\\b", r"\\bvue\\b", r"\\bvuejs\\b"],\n',
        '    "NextJS":            [r"\\bnext\\.?js\\b", r"\\bnextjs\\b"],\n',
        '    "HTML":              [r"\\bhtml5?\\b", r"\\bhtml/css\\b"],\n',
        '    "CSS":               [r"\\bcss3?\\b", r"\\bsass\\b", r"\\bscss\\b", r"\\btailwind\\b", r"\\bbootstrap\\b", r"\\bstyled\\s*components\\b"],\n',
        '\n',
        '    # ── ML / AI ──────────────────────────────────────────────────────────\n',
        '    "TensorFlow":        [r"\\btensorflow\\b", r"\\btf\\b", r"\\bkeras\\b"],\n',
        '    "PyTorch":           [r"\\bpytorch\\b", r"\\btorch\\b", r"\\bdeep\\s+learning\\b"],\n',
        '    "Scikit":            [r"\\bscikit[\\s\\-]?learn\\b", r"\\bsklearn\\b", r"\\bscikit\\b", r"\\bxboost\\b", r"\\blgbm\\b", r"\\bcatboost\\b", r"\\brandom\\s*forest\\b", r"\\bsvm\\b"],\n',
        '    "Pandas":            [r"\\bpandas\\b", r"\\bnumpy\\b", r"\\bmatplotlib\\b", r"\\bseaborn\\b", r"\\bplotly\\b", r"\\bjupyter\\b", r"\\bscipy\\b"],\n',
        '    "NLP":               [r"\\bnlp\\b", r"\\bnatural\\s+language\\s+processing\\b", r"\\bspacy\\b", r"\\bnltk\\b", r"\\btransformers\\b", r"\\bhugging\\s*face\\b", r"\\bbert\\b", r"\\blstm\\b", r"\\brnn\\b"],\n',
        '    "ComputerVision":    [r"\\bcomputer\\s*vision\\b", r"\\bcv\\b", r"\\bopencv\\b", r"\\byolo\\b", r"\\bcnn\\b", r"\\bimage\\s+processing\\b", r"\\bimage\\s+recognition\\b"],\n',
        '    "LLM":               [r"\\bllm\\b", r"\\blarge\\s+language\\s+model\\b", r"\\bgpt\\b", r"\\bgpt-?\\d+\\b", r"\\bbert\\b", r"\\bllama\\b", r"\\bgenerative\\s+ai\\b", r"\\bgenai\\b", r"\\blangchain\\b", r"\\bopenai\\b", r"\\bclaude\\b"],\n',
        '    "PromptEngineering": [r"\\bprompt\\s*engineering\\b", r"\\bprompt\\s*design\\b", r"\\bprompting\\b"],\n',
        '\n',
        '    # ── General / Core ───────────────────────────────────────────────────\n',
        '    "OOPS":             [r"\\boops\\b", r"\\bobject[\\s\\-]oriented\\b", r"\\boop\\b", r"\\bdesign\\s*patterns\\b", r"\\bpolymorphism\\b", r"\\binheritance\\b", r"\\bencapsulation\\b", r"\\babstraction\\b"],\n',
        '\n',
        '    # ── Cloud / DevOps ───────────────────────────────────────────────────\n',
        '    "AWS":               [r"\\baws\\b", r"\\bamazon\\s+web\\s+services\\b", r"\\bec2\\b", r"\\bs3\\b", r"\\blambda\\b", r"\\brds\\b", r"\\belastic\\s*beanstalk\\b", r"\\biam\\b", r"\\bdynamodb\\b"],\n',
        '    "Azure":             [r"\\bazure\\b", r"\\bazure\\s+devops\\b", r"\\bms\\s*azure\\b"],\n',
        '    "GCP":               [r"\\bgcp\\b", r"\\bgoogle\\s+cloud\\b", r"\\bgce\\b", r"\\bgcs\\b", r"\\bgoogle\\s+cloud\\s+platform\\b"],\n',
        '    "Docker":            [r"\\bdocker\\b", r"\\bcontainer\\b", r"\\bdockerfile\\b"],\n',
        '    "Kubernetes":        [r"\\bkubernetes\\b", r"\\bk8s\\b", r"\\bhelm\\b", r"\\bkustomize\\b"],\n',
        '    "CI/CD":             [r"\\bci\\s*/\\s*cd\\b", r"\\bcicd\\b", r"\\bcontinuous\\s+integration\\b",\n',
        '                          r"\\bcontinuous\\s+deployment\\b", r"\\bcontinuous\\s+delivery\\b",\n',
        '                          r"\\bgithub\\s+actions\\b", r"\\bjenkins\\b", r"\\bcircleci\\b", r"\\btravis\\b", r"\\bgitlab\\s*ci\\b", r"\\bazure\\s*pipelines\\b"],\n',
        '\n',
        '    # ── Security ─────────────────────────────────────────────────────────\n',
        '    "EthicalHacking":    [r"\\bethical\\s*hacking\\b", r"\\bpenetration\\s*testing\\b",\n',
        '                          r"\\bpen\\s*test\\b", r"\\bkali\\b", r"\\bmetasploit\\b", r"\\bburp\\b", r"\\bwireshark\\b"],\n',
        '    "Cryptography":      [r"\\bcryptography\\b", r"\\bcrypto\\b", r"\\baes\\b", r"\\brsa\\b", r"\\bsha\\b", r"\\bhashing\\b", r"\\bencryption\\b"],\n',
        '    "NetworkSecurity":   [r"\\bnetwork\\s*security\\b", r"\\bfirewall\\b",\n',
        '                          r"\\bintrusion\\s+detection\\b", r"\\bwireshark\\b", r"\\bnmap\\b", r"\\bsnort\\b"],\n',
        '\n',
        '    # ── Mobile ───────────────────────────────────────────────────────────\n',
        '    "Android":           [r"\\bandroid\\b", r"\\bkotlin\\b", r"\\bandroid\\s*studio\\b"],\n',
        '    "Flutter":           [r"\\bflutter\\b", r"\\bdart\\b"],\n',
        '    "ReactNative":       [r"\\breact\\s*native\\b", r"\\breact-native\\b"],\n',
        '\n',
        '    # ── CS fundamentals ──────────────────────────────────────────────────\n',
        '    "SystemDesign":      [r"\\bsystem\\s*design\\b", r"\\bhld\\b", r"\\blld\\b", r"\\bscalability\\b", r"\\bload\\s+balancer\\b", r"\\bdistributed\\s*systems\\b", r"\\bmicroservices\\b"],\n',
        '    "DBMS":              [r"\\bdbms\\b", r"\\bdatabase\\s+management\\b", r"\\brdbms\\b", r"\\bmysql\\b", r"\\bmongodb\\b", r"\\bredis\\b", r"\\bpostgresql\\b"],\n',
        '    "OS":                [r"\\boperating\\s*system\\b", r"\\blinux\\b", r"\\bunix\\b", r"\\bwindows\\b", r"\\bubuntu\\b", r"\\bcentos\\b", r"\\bthreading\\b", r"\\bprocess\\b"],\n',
        '}\n'
    ]
    lines[start_idx:end_idx+1] = new_patterns
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Successfully updated skills.")
else:
    print(f"Could not find dictionary markers. start={start_idx}, end={end_idx}")
    sys.exit(1)
