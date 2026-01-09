from app.core.config import get_settings
try:
    s = get_settings()
    print("Settings loaded successfully")
    print(f"DATABASE_URL: {s.DATABASE_URL}")
except Exception as e:
    import traceback
    traceback.print_exc()
