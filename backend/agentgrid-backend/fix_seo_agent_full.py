
import sys
import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.getcwd())

from app.models.agent import Agent
from app.agents.seo_agent import SEO_AGENT_ID

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/agentgrid")

# Fallback for local run if env var not set (though we run in container)
if "postgres" not in DATABASE_URL and "sqlite" in DATABASE_URL:
    # If running locally with sqlite, use that. But we are in container.
    pass

def fix_seo_agent_config():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        agent = db.query(Agent).filter(Agent.id == uuid.UUID(SEO_AGENT_ID)).first()
        if not agent:
            print(f"SEO Agent {SEO_AGENT_ID} not found.")
            return

        print(f"Fixing Agent: {agent.name}")
        
        # Fix Config
        new_config = agent.config.copy()
        new_config["temperature"] = 0.7
        new_config["max_tokens"] = 2000
        agent.config = new_config
        
        # Fix Capabilities strings (Validation Errors if None)
        if agent.capabilities is None:
             agent.capabilities = []
        
        if agent.limitations is None:
             agent.limitations = []
             
        # Also ensure tags is not None
        if agent.tags is None:
            agent.tags = []

        db.commit()
        db.refresh(agent)
        print("Successfully updated Agent config and lists.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_seo_agent_config()
