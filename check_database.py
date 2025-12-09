"""
Check database connection and query agents table directly
"""
import sys
sys.path.insert(0, 'backend/agentgrid-backend')

from app.db.session import SessionLocal
from app.models.agent import Agent
from app.models.user import User

# Create database session
db = SessionLocal()

try:
    # Check if database connection works
    print("=== DATABASE CONNECTION TEST ===")
    users = db.query(User).all()
    print(f"Total users in database: {len(users)}")
    for user in users:
        print(f"  - {user.username} ({user.email}) - Role: {user.role.value}")
    
    # Check agents table
    print("\n=== AGENTS TABLE ===")
    all_agents = db.query(Agent).all()
    print(f"Total agents in database (all statuses): {len(all_agents)}")
    
    if all_agents:
        for agent in all_agents:
            print(f"\nAgent: {agent.name}")
            print(f"  ID: {agent.id}")
            print(f"  Status: {agent.status.value}")
            print(f"  Category: {agent.category}")
            print(f"  Creator ID: {agent.creator_id}")
            print(f"  Price: {agent.price_per_run}")
    else:
        print("No agents found in database!")
        
    # Check pending review agents specifically
    pending_agents = db.query(Agent).filter(Agent.status == 'pending_review').all()
    print(f"\nPending review agents: {len(pending_agents)}")
    
    active_agents = db.query(Agent).filter(Agent.status == 'active').all()
    print(f"Active agents: {len(active_agents)}")
    
finally:
    db.close()
