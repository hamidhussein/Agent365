import sys
import os
from pathlib import Path

# Simulate alembic/env.py path setup
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

print(f"Sys path: {sys.path}")

try:
    print(f"Current CWD: {os.getcwd()}")
    env_path = Path(".env")
    print(f".env exists: {env_path.exists()}")
    if env_path.exists():
        print(f".env content:\n{env_path.read_text()}")
    
    print(f"os.environ DATABASE_URL: {os.environ.get('DATABASE_URL')}")
    
    from app.core.config import get_settings
    settings = get_settings()
    print("Import successful")
    print(f"DB URL: {settings.DATABASE_URL}")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
