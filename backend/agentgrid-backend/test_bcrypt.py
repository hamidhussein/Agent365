from app.core.security import get_password_hash, verify_password

try:
    pwd = "test"
    hashed = get_password_hash(pwd)
    print(f"Hash: {hashed}")
    valid = verify_password(pwd, hashed)
    print(f"Valid: {valid}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
