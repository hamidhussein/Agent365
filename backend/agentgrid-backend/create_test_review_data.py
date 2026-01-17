
import uuid
import datetime

def setup_data():
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.models.agent import Agent
    from app.models.enums import AgentCategory, AgentStatus, ReviewStatus, ExecutionStatus
    from app.models.execution import AgentExecution
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        # Check if test creator already exists
        username = "visibility_test_creator"
        creator = db.query(User).filter(User.username == username).first()
        if not creator:
            creator = User(
                email=f"{username}@example.com",
                username=username,
                hashed_password=get_password_hash("Password123!"),
                full_name="Visibility Test Creator",
                credits=1000
            )
            db.add(creator)
            db.flush()

        # 2. Create agent
        agent_name = "Visibility Test Agent"
        agent = db.query(Agent).filter(Agent.name == agent_name).first()
        if not agent:
            agent = Agent(
                id=uuid.uuid4(),
                name=agent_name,
                description="Testing dashboard visibility features.",
                category=AgentCategory.PRODUCTIVITY.value,
                tags=[],
                price_per_run=1,
                creator_id=creator.id,
                status=AgentStatus.ACTIVE,
                is_public=True,
                allow_reviews=True,
                review_cost=5,
                config={
                    "creator_studio": {
                        "instruction": "Simple echo instruction for testing.",
                        "model": "gpt-3.5-turbo",
                        "color": "blue",
                        "inputs": []
                    }
                }
            )
            db.add(agent)
            db.flush()

        # Clean existing test executions for this agent
        db.query(AgentExecution).filter(AgentExecution.agent_id == agent.id).delete()

        # 3. Create Pending Review
        exec_pending = AgentExecution(
            id=uuid.uuid4(),
            agent_id=agent.id,
            user_id=None,
            status=ExecutionStatus.COMPLETED,
            inputs={"test": "pending"},
            outputs={"result": "pending"},
            review_status=ReviewStatus.PENDING,
            review_request_note="Please help me with this pending review.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        )
        db.add(exec_pending)

        # 4. Create Completed Review
        exec_completed = AgentExecution(
            id=uuid.uuid4(),
            agent_id=agent.id,
            user_id=None,
            status=ExecutionStatus.COMPLETED,
            inputs={"test": "completed"},
            outputs={"result": "improved result"},
            review_status=ReviewStatus.COMPLETED,
            review_request_note="Need expert eyes here.",
            review_response_note="I fixed the outputs for you.",
            reviewed_at=datetime.datetime.utcnow(),
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        )
        db.add(exec_completed)

        db.commit()
        print(f"CREATED_CREATOR: {username}")
        print(f"CREATED_AGENT_ID: {agent.id}")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    setup_data()
