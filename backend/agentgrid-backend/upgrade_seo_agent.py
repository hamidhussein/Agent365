import sys
import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.getcwd())

from app.models.agent import Agent
from app.agents.seo_agent import SEO_AGENT_ID

# Database URL (This will pick up the RAILWAY env var when run in prod)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agentgrid.db")

def upgrade_seo_agent_inputs():
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print(f"Checking SEO Agent {SEO_AGENT_ID} configuration...")
        agent = db.query(Agent).filter(Agent.id == uuid.UUID(SEO_AGENT_ID)).first()
        if not agent:
            print("SEO Agent not found.")
            return

        # Check if 'config' exists and has 'required_inputs'
        config = agent.config
        if not config or "required_inputs" not in config:
            print("Agent has no config or required_inputs.")
            return

        inputs = config["required_inputs"]
        print(f"Current inputs: {[i['name'] for i in inputs]}")

        # Filter out openai_api_key
        new_inputs = [i for i in inputs if i["name"] != "openai_api_key"]

        if len(new_inputs) < len(inputs):
            print("Removing 'openai_api_key' from inputs...")
            new_config = config.copy()
            new_config["required_inputs"] = new_inputs
            
            # Explicit assignment to trigger SQLAlchemy JSON mutation tracking
            agent.config = new_config
            db.commit()
            print("Successfully updated agent config.")
        else:
            print("No changes needed ('openai_api_key' not found in inputs).")

    except Exception as e:
        print(f"Error updating agent: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    upgrade_seo_agent_inputs()
