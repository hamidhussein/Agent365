import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

try:
    from app.main import app
    print("App imported successfully", flush=True)
except Exception as e:
    import traceback
    print("Error importing app:", flush=True)
    traceback.print_exc()
    sys.exit(1)

print("Attempting to trigger startup events...", flush=True)
# Manually trigger startup events if possible or just check the registry
try:
    from app.db.session import SessionLocal
    from app.services.creator_studio import seed_llm_configs, build_vector_index
    db = SessionLocal()
    print("DB connected", flush=True)
    seed_llm_configs(db)
    print("LLM configs seeded", flush=True)
    build_vector_index(db)
    print("Vector index built", flush=True)
    db.close()
    print("Startup logic completed successfully", flush=True)
except Exception as e:
    import traceback
    print("Error during startup logic:")
    traceback.print_exc()
    sys.exit(1)
