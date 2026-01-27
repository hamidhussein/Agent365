"""Initialize database tables"""
from app.db.base import Base
from app.db.session import engine
import app.models  # Import all models

print("Creating all database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")
