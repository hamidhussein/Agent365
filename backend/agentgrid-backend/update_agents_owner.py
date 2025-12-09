from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.agent import Agent

def update_agents_owner():
    db: Session = SessionLocal()
    try:
        # 1. Find the user
        target_email = "logintest@test.com"
        user = db.query(User).filter(User.email == target_email).first()
        
        if not user:
            print(f"User with email {target_email} not found!")
            return

        print(f"Found user: {user.email} (ID: {user.id})")

        # 2. Update user name to Axeecom
        user.full_name = "Axeecom"
        user.username = "Axeecom" # Also update username if needed
        db.add(user)
        print("Updated user name to Axeecom")

        # 3. Find all agents
        agents = db.query(Agent).all()
        print(f"Found {len(agents)} agents.")

        # 4. Update creator_id for all agents
        count = 0
        for agent in agents:
            agent.creator_id = user.id
            db.add(agent)
            count += 1
        
        db.commit()
        print(f"Successfully reassigned {count} agents to {target_email} (Axeecom).")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_agents_owner()
