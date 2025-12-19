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
DATABASE_URL = "sqlite:///./agentgrid.db"

def fix_seo_agent_config():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        agent = db.query(Agent).filter(Agent.id == uuid.UUID(SEO_AGENT_ID)).first()
        if not agent:
            print(f"SEO Agent {SEO_AGENT_ID} not found.")
            return

        print(f"Current config: {agent.config}")
        
        new_config = agent.config.copy()
        # Add missing required fields for AgentConfig schema
        new_config["temperature"] = 0.7
        new_config["max_tokens"] = 2000
        
        # SQLAlchemy tracks mutations to JSON objects if you re-assign
        agent.config = new_config
        
        db.commit()
        db.refresh(agent)
        print(f"Updated config: {agent.config}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_seo_agent_config()
