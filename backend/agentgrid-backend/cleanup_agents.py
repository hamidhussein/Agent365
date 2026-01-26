import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.agent import Agent
from app.agents.examples import ECHO_AGENT_ID

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/agentgrid")

def cleanup_database():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print(f"Cleaning up agents in database: {DATABASE_URL}")
        
        # Keep only the Echo Agent
        echo_uuid = uuid.UUID(ECHO_AGENT_ID)
        
        # Delete all other agents
        num_deleted = db.query(Agent).filter(Agent.id != echo_uuid).delete(synchronize_session=False)
        db.commit()
        
        print(f"Successfully deleted {num_deleted} redundant agents.")
        print(f"Kept agent: {ECHO_AGENT_ID} (Echo Agent)")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_database()
