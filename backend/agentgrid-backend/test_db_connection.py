import sys
import os
from sqlalchemy import inspect, text

# Add current directory to sys.path
sys.path.append(os.getcwd())

from app.db.base import engine
from app.core.config import get_settings

settings = get_settings()
print(f"Settings DATABASE_URL: {settings.DATABASE_URL}")
print(f"Engine URL: {engine.url}")

try:
    with engine.connect() as conn:
        print("Connection successful!")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"Tables: {tables}")
        
        if 'users' in tables:
            result = conn.execute(text("SELECT count(*) FROM users"))
            print(f"User count: {result.scalar()}")
        else:
            print("Users table NOT found!")
            
except Exception as e:
    print(f"Connection failed: {e}")
