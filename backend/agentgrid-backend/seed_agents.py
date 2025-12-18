import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.agent import Agent
from app.models.user import User
from app.models.enums import AgentStatus, AgentCategory
from app.agents.examples import ECHO_AGENT_ID

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

if __name__ == "__main__":
    seed_echo_agent()
