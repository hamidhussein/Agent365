from typing import Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.execution import AgentExecution
from app.models.user import User
from app.models.agent import Agent
from app.models.enums import ExecutionStatus
from app.agents.registry import get_agent_class

class ExecutionService:
    @staticmethod
    def execute_agent(
        db: Session,
        agent_id: str,
        inputs: Dict[str, Any],
        user: User
    ) -> AgentExecution:
        # 1. Validate Agent Exists in DB
        db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not db_agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        # 2. Get Python Implementation
        AgentClass = get_agent_class(str(agent_id))
        if not AgentClass:
            raise HTTPException(
                status_code=501, 
                detail="Agent implementation not found. This agent may not be active yet."
            )

        # 3. Check Credits (Optional - implement later)
        # if user.credits < db_agent.price_per_run:
        #     raise HTTPException(status_code=402, detail="Insufficient credits")

        # 4. Create Execution Record
        execution = AgentExecution(
            agent_id=agent_id,
            user_id=user.id,
            status=ExecutionStatus.RUNNING,
            inputs=inputs,
            credits_used=int(db_agent.price_per_run)
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)

        try:
            # 5. Run the Agent
            agent_instance = AgentClass()
            outputs = agent_instance.run(inputs)

            # 6. Update Execution Record (Success)
            execution.status = ExecutionStatus.COMPLETED
            execution.outputs = outputs
            
            # Deduct credits here if needed
            
        except Exception as e:
            # 7. Handle Errors
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            raise e
        finally:
            db.commit()
            db.refresh(execution)

        return execution
