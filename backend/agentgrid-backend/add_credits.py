import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.getcwd())

from app.models.user import User
from app.db.base import Base

# Database URL
DATABASE_URL = "sqlite:///./agentgrid.db"

def add_credits(username: str, amount: int):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User '{username}' not found.")
            return

        print(f"Current credits for {username}: {user.credits}")
        user.credits += amount
        db.commit()
        db.refresh(user)
        print(f"Added {amount} credits. New balance: {user.credits}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        username = sys.argv[1]
    else:
        username = "mansoork"
    
    add_credits(username, 1000)
