import sys
import os
from datetime import datetime, timedelta
import random

# Add the parent directory to sys.path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.agent import Agent
from app.models.execution import AgentExecution
from app.models.transaction import CreditTransaction
from app.models.enums import ExecutionStatus, TransactionType

def populate_data():
    db: Session = SessionLocal()
    try:
        # 1. Find the user
        # Try to find user "Marwan" first, otherwise get the first user
        user = db.query(User).filter(User.username == "Marwan").first()
        if not user:
            print("User 'Marwan' not found. Trying to find any user...")
            user = db.query(User).first()
        
        if not user:
            print("No users found in the database. Please sign up first.")
            return

        print(f"Found user: {user.username} ({user.id})")

        # 2. Update Credits
        print(f"Current credits: {user.credits}")
        user.credits = 5000
        db.add(user)
        print(f"Updated credits to: {user.credits}")

        # 3. Create Transactions
        # Clear existing transactions for clean slate (optional, but good for testing)
        # db.query(CreditTransaction).filter(CreditTransaction.user_id == user.id).delete()
        
        transactions = []
        # Purchase
        transactions.append(CreditTransaction(
            user_id=user.id,
            amount=10000,
            transaction_type=TransactionType.PURCHASE,
            description="Purchased 10,000 Credits",
            created_at=datetime.utcnow() - timedelta(days=5)
        ))
        # Usage
        transactions.append(CreditTransaction(
            user_id=user.id,
            amount=-500,
            transaction_type=TransactionType.USAGE,
            description="Ran Agent: Data Analyzer",
            created_at=datetime.utcnow() - timedelta(days=2)
        ))
        # Bonus
        transactions.append(CreditTransaction(
            user_id=user.id,
            amount=200,
            transaction_type=TransactionType.EARNING, # Using EARNING as closest mapping to Bonus if Bonus doesn't exist in Enum, or check Enum
            description="Weekly Login Bonus",
            created_at=datetime.utcnow() - timedelta(hours=12)
        ))

        db.add_all(transactions)
        print(f"Added {len(transactions)} transactions.")

        # 4. Create Executions
        # Need an agent first
        agent = db.query(Agent).first()
        if not agent:
            print("No agents found. Creating a dummy agent...")
            # Create a dummy agent if none exists (should exist from previous steps)
            # Skipping agent creation for now, assuming marketplace has agents
            print("WARNING: No agents found to link executions to.")
        else:
            print(f"Using agent: {agent.name} ({agent.id})")
            
            executions = []
            statuses = [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.RUNNING, ExecutionStatus.PENDING]
            
            for i in range(5):
                status = statuses[i % len(statuses)]
                executions.append(AgentExecution(
                    agent_id=agent.id,
                    user_id=user.id,
                    status=status,
                    inputs={"query": "test input", "param": i},
                    outputs={"result": "success"} if status == ExecutionStatus.COMPLETED else None,
                    error_message="Something went wrong" if status == ExecutionStatus.FAILED else None,
                    credits_used=100 if status == ExecutionStatus.COMPLETED else 0,
                    created_at=datetime.utcnow() - timedelta(days=i, hours=random.randint(1, 5))
                ))
            
            db.add_all(executions)
            print(f"Added {len(executions)} executions.")

        db.commit()
        print("Database populated successfully!")

    except Exception as e:
        print(f"Error populating database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_data()
