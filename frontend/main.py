from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_MAIN = PROJECT_ROOT / "main.py"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

spec = spec_from_file_location("hireready_backend_main", BACKEND_MAIN)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load backend app module from {BACKEND_MAIN}")

backend_main = module_from_spec(spec)
spec.loader.exec_module(backend_main)

app = backend_main.app