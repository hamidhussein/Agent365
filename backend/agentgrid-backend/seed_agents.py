import os
import uuid

from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker

from app.core.security import get_password_hash
from app.models.agent import Agent
from app.models.enums import AgentCategory, AgentStatus, UserRole
from app.models.user import User

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5435/agent365")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@agent365.dev").strip().lower()
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
DEFAULT_DEMO_EMAIL = os.getenv("DEMO_CREATOR_EMAIL", "demo@agent365.dev").strip().lower()
DEFAULT_DEMO_PASSWORD = os.getenv("DEMO_CREATOR_PASSWORD", "Demo123!")
EXAMPLE_AGENT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def wait_for_db(max_retries: int = 30, delay: int = 3) -> None:
    import time
    from sqlalchemy.exc import OperationalError

    print("Checking database connection...")
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect():
                print("Database connection established!")
                return
        except OperationalError:
            print(f"Database not ready yet ({attempt}/{max_retries}), retrying in {delay}s...")
            time.sleep(delay)
    print("Could not connect to database after retries. Seeding may fail.")


def _username_from_email(email: str) -> str:
    base = email.split("@", 1)[0].strip() or "creator"
    safe = "".join(ch for ch in base if ch.isalnum() or ch in ("-", "_"))
    return (safe or "creator")[:50]


def _upsert_user(db, *, email: str, password: str, role: UserRole, full_name: str) -> User:
    target_username = _username_from_email(email)
    user = (
        db.query(User)
        .filter(or_(User.email == email, User.username == target_username))
        .first()
    )
    if user is None:
        user = User(
            id=uuid.uuid4(),
            email=email,
            username=target_username,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user: {email} ({role.value})")
        return user

    changed = False
    if user.email != email:
        user.email = email
        changed = True
    if user.username != target_username:
        user.username = target_username
        changed = True
    if user.role != role:
        user.role = role
        changed = True
    if user.full_name != full_name:
        user.full_name = full_name
        changed = True
    user.hashed_password = get_password_hash(password)
    changed = True
    if changed:
        db.commit()
        db.refresh(user)
        print(f"Updated user: {email} ({role.value})")
    return user


def _example_creator_agent_config() -> dict:
    return {
        "creator_studio": {
            "instruction": (
                "You are a helpful Creator Studio demo assistant. Answer clearly, use uploaded "
                "knowledge when available, and ask follow-up questions when requirements are unclear."
            ),
            "model": "gemini-1.5-flash-preview",
            "color": "bg-slate-600",
            "inputs": [],
            "enabledCapabilities": {
                "codeExecution": False,
                "webBrowsing": False,
                "apiIntegrations": False,
                "fileHandling": True,
            },
        }
    }


def seed_creator_studio_demo() -> None:
    db = SessionLocal()
    try:
        admin = _upsert_user(
            db,
            email=DEFAULT_ADMIN_EMAIL,
            password=DEFAULT_ADMIN_PASSWORD,
            role=UserRole.ADMIN,
            full_name="Agent365 Admin",
        )
        demo_creator = _upsert_user(
            db,
            email=DEFAULT_DEMO_EMAIL,
            password=DEFAULT_DEMO_PASSWORD,
            role=UserRole.CREATOR,
            full_name="Demo Creator",
        )

        agent = db.query(Agent).filter(Agent.id == EXAMPLE_AGENT_ID).first()
        payload = {
            "name": "Demo Private Assistant",
            "description": "A private Creator Studio demo agent for local development.",
            "long_description": "A private Creator Studio demo agent for local development.",
            "category": AgentCategory.PRODUCTIVITY.value,
            "tags": ["demo", "creator-studio"],
            "status": AgentStatus.ACTIVE,
            "config": _example_creator_agent_config(),
            "capabilities": ["file_handling"],
            "limitations": [],
            "demo_available": False,
            "version": "1.0.0",
            "creator_id": demo_creator.id,
        }

        if agent is None:
            agent = Agent(id=EXAMPLE_AGENT_ID, rating=0.0, total_runs=0, total_reviews=0, **payload)
            db.add(agent)
            db.commit()
            print(f"Seeded demo Creator Studio agent: {EXAMPLE_AGENT_ID}")
        else:
            for key, value in payload.items():
                setattr(agent, key, value)
            db.commit()
            print(f"Updated demo Creator Studio agent: {EXAMPLE_AGENT_ID}")

        print(f"Admin login: {admin.email}")
        print(f"Demo creator login: {demo_creator.email}")
    except Exception as exc:
        db.rollback()
        print(f"Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    wait_for_db()
    seed_creator_studio_demo()
