import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.agent import Agent
from app.models.user import User
from app.models.enums import AgentStatus, AgentCategory
from app.agents.examples import ECHO_AGENT_ID
from app.agents.seo_agent import SEO_AGENT_ID

# Database URL
# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agentgrid.db")

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def wait_for_db(max_retries=30, delay=3):
    """Wait for the database to be ready before seeding."""
    import time
    from sqlalchemy.exc import OperationalError
    
    print("Checking database connection...")
    for i in range(max_retries):
        try:
            # Try to connect
            with engine.connect() as connection:
                print("Database connection established!")
                return
        except OperationalError as e:
            print(f"Database not ready yet (Attempt {i+1}/{max_retries}). Retrying in {delay}s...")
            time.sleep(delay)
    
    print("Could not connect to database after multiple retries. Seeding may fail.")

def seed_echo_agent():
    # Wait for DB first
    # (We call this once in main)
    db = SessionLocal()
    try:
        # 1. Get a creator (or create one)
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first()
        if not creator:
            print("Creating default admin user...")
            from app.core.security import get_password_hash
            from app.models.enums import UserRole
            creator = User(
                id=uuid.uuid4(),
                email="admin@agentgrid.ai",
                username="admin",
                full_name="Admin User",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN.value if hasattr(UserRole.ADMIN, 'value') else UserRole.ADMIN,
                credits=100
            )
            db.add(creator)
            db.commit()
            db.refresh(creator)

        # 2. Check if agent exists
        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(ECHO_AGENT_ID)).first()
        if existing_agent:
            print(f"Echo Agent {ECHO_AGENT_ID} already exists.")
            return

        # 3. Create Agent
        echo_agent = Agent(
            id=uuid.UUID(ECHO_AGENT_ID),
            name="Echo Agent",
            description="A simple agent that echoes back your input.",
            long_description="This agent is a demonstration of the manual agent integration. It takes a message as input and returns it as output.",
            category=AgentCategory.AUTOMATION.value,
            tags=["demo", "echo"],
            price_per_run=1.0,
            status=AgentStatus.ACTIVE,
            config={
                "model": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 1000,
                "timeout_seconds": 60,
                "required_inputs": [
                    {
                        "name": "message",
                        "type": "string",
                        "description": "The message to echo back.",
                        "required": True
                    }
                ]
            },
            creator_id=creator.id,
            version="1.0.0"
        )
        
        db.add(echo_agent)
        db.commit()
        print(f"Successfully seeded Echo Agent: {ECHO_AGENT_ID}")

    except Exception as e:
        print(f"Error seeding agent: {e}")
        db.rollback()
    finally:
        db.close()

from app.agents.seo_agent import SEO_AGENT_ID

# ... (existing imports)

def seed_seo_agent():
    db = SessionLocal()
    try:
        # 1. Get a creator (or create one)
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first()
        if not creator:
            creator = db.query(User).first()
        
        if not creator:
            print("No users found. Please runs echo agent seed first or register a user.")
            return

        # 2. Check if agent exists
        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(SEO_AGENT_ID)).first()
        if existing_agent:
            print(f"SEO Agent {SEO_AGENT_ID} already exists.")
            return

        # 3. Create Agent
        seo_agent = Agent(
            id=uuid.UUID(SEO_AGENT_ID),
            name="SEO Audit Agent",
            description="Crawls a website, performs SEO analysis, generates LLM summary and recommendations, outputs JSON + optional PDF report.",
            long_description="A comprehensive SEO audit tool that crawls your website, analyzes key metrics (H1s, meta tags, load time), and uses GPT-4 to provide actionable recommendations. Can generate a PDF report.",
            category=AgentCategory.ANALYSIS.value,
            tags=["seo", "audit", "marketing", "analysis"],
            price_per_run=5.0,
            status=AgentStatus.ACTIVE,
            config={
                "model": "gpt-4o-mini",
                "temperature": 0.3,
                "max_tokens": 2000,
                "timeout_seconds": 300,
                "required_inputs": [
                    {
                        "name": "url",
                        "type": "string",
                        "description": "Website URL to audit",
                        "required": True
                    },
                    {
                        "name": "max_pages",
                        "type": "number",
                        "description": "Maximum pages to crawl (default: 20)",
                        "required": False
                    },
                    {
                        "name": "openai_api_key",
                        "type": "string",
                        "description": "LLM API key",
                        "required": True
                    },
                    {
                        "name": "generate_pdf",
                        "type": "boolean",
                        "description": "Whether to return PDF report",
                        "required": False
                    }
                ]
            },
            capabilities=["SEO Audit", "Site Crawling", "Content Analysis"],
            limitations=["Requires publicly accessible URLs", "Max 20 pages"],
            demo_available=True,
            creator_id=creator.id,
            version="1.0.0"
        )
        
        db.add(seo_agent)
        db.commit()
        print(f"Successfully seeded SEO Agent: {SEO_AGENT_ID}")

    except Exception as e:
        print(f"Error seeding SEO agent: {e}")
        db.rollback()
    finally:
        db.close()

# New Agent UUID
YOUTUBE_AGENT_ID = "11111111-1111-1111-1111-111111111111"

def seed_youtube_agent():
    db = SessionLocal()
    try:
        # 1. Get creator
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first()
        if not creator:
            creator = db.query(User).first()
        
        if not creator:
            print("No users found.")
            return

        # 2. Check existence
        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(YOUTUBE_AGENT_ID)).first()
        if existing_agent:
            print(f"YouTube Agent {YOUTUBE_AGENT_ID} already exists. Updating config...")
            existing_agent.config = {
                "model": "gpt-4",
                "temperature": 0.5,
                "max_tokens": 4000,
                "timeout_seconds": 120,
                "required_inputs": [
                    {
                        "name": "video_url",
                        "type": "string",
                        "description": "YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)",
                        "required": True
                    }
                ]
            }
            db.add(existing_agent)
            db.commit()
            print(f"Updated config for YouTube Agent: {YOUTUBE_AGENT_ID}")
            return

        # 3. Create Agent
        agent = Agent(
            id=uuid.UUID(YOUTUBE_AGENT_ID),
            name="YouTube Summarizer",
            description="Transform any YouTube video into a concise summary with key takeaways.",
            long_description="Stop wasting time watching long videos. This agent extracts the transcript from any YouTube URL and uses GPT-4 to generate a structured summary, including a TL;DR, key takeaways, and a detailed breakdown of the content.",
            category=AgentCategory.RESEARCH.value,
            tags=["youtube", "summary", "research", "video"],
            price_per_run=2.0,
            status=AgentStatus.ACTIVE,
            config={
                "model": "gpt-4",
                "temperature": 0.5,
                "max_tokens": 4000,
                "timeout_seconds": 120,
                "required_inputs": [
                    {
                        "name": "video_url",
                        "type": "string",
                        "description": "YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)",
                        "required": True
                    }
                ]
            },
            capabilities=["Transcript Extraction", "Content Summarization"],
            limitations=["Videos with disabled captions specifically may fail", "Very long videos > 1 hour may be truncated"],
            demo_available=True,
            creator_id=creator.id,
            version="1.0.0"
        )
        
        db.add(agent)
        db.commit()
        print(f"Successfully seeded YouTube Agent: {YOUTUBE_AGENT_ID}")

    except Exception as e:
        print(f"Error seeding YouTube agent: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    wait_for_db()
    seed_echo_agent()
    seed_seo_agent()
    seed_youtube_agent()
