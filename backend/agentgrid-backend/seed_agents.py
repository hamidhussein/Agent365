import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.agent import Agent
from app.models.user import User
from app.models.enums import AgentStatus, AgentCategory
from app.agents.examples import ECHO_AGENT_ID
from app.agents.seo_agent import SEO_AGENT_ID

# Database URL
DATABASE_URL = "sqlite:///./agentgrid.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_echo_agent():
    db = SessionLocal()
    try:
        # 1. Get a creator (or create one)
        creator = db.query(User).first()
        if not creator:
            print("No users found. Please register a user first.")
            return

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
        creator = db.query(User).first()
        if not creator:
            print("No users found. Please register a user first.")
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

if __name__ == "__main__":
    seed_echo_agent()
    seed_seo_agent()
