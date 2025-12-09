import sys
import os

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import Base
from app.db.session import engine
from app.models import * # Import all models to ensure they are registered

def update_schema():
    print("Creating missing tables...")
    Base.metadata.create_all(bind=engine)
    print("Schema updated successfully!")

if __name__ == "__main__":
    update_schema()
