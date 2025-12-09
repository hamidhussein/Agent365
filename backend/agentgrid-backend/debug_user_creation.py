import sys
import os
from uuid import uuid4

# Add project root to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.schemas.user import UserCreate
from app.services.auth import register_user
from app.models.enums import UserRole

def test_create_user():
    db = SessionLocal()
    try:
        email = f"debug_{uuid4()}@example.com"
        username = f"debug_{uuid4()}"
        user_in = UserCreate(
            email=email,
            username=username,
            full_name="Debug User",
            password="Password123!",
            role=UserRole.USER
        )
        print(f"Attempting to create user: {email}")
        user = register_user(db, user_in)
        print(f"User created successfully: {user.id}")
        
        from app.schemas.user import UserRead
        print("Validating against UserRead schema...")
        user_read = UserRead.model_validate(user)
        print("Validation successful!")
        print(user_read.model_dump_json())
    except Exception as e:
        print("Error creating user:")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_create_user()
