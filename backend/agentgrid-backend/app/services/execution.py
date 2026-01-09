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
        import sys
        print(f"DEBUG: execute_agent started for {agent_id}", flush=True)
        try:
            # 1. Get Agent from DB
            db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if not db_agent:
                print("DEBUG: Agent not found in DB", flush=True)
                raise HTTPException(status_code=404, detail="Agent not found")
            if db_agent.source == "creator_studio":
                raise HTTPException(status_code=400, detail="Creator Studio agents run inside Creator Studio")
            
            # 2. Get Agent Class
            print("DEBUG: Getting agent class", flush=True)
            AgentClass = get_agent_class(str(agent_id))
            if not AgentClass:
                print(f"DEBUG: Agent Class not found for ID {agent_id}", flush=True)
                raise HTTPException(status_code=501, detail="Agent implementation not found")

            # 3. Check Credits
            if user.credits < db_agent.price_per_run:
                raise HTTPException(status_code=402, detail="Insufficient credits")

            import uuid
            execution_id = uuid.uuid4()
            
            # 4. Create Execution Record
            execution = AgentExecution(
                id=execution_id,
                agent_id=agent_id,
                user_id=user.id,
                status=ExecutionStatus.RUNNING,
                inputs=inputs,
                credits_used=int(db_agent.price_per_run)
            )
            db.add(execution)
            
            # DEDUCT CREDITS & LOG TRANSACTION
            user.credits -= int(db_agent.price_per_run)
            db.add(user) # Update user

            from app.models.transaction import CreditTransaction
            from app.models.enums import TransactionType

            transaction = CreditTransaction(
                user_id=user.id,
                amount=-int(db_agent.price_per_run),
                transaction_type=TransactionType.USAGE,
                description=f"Run agent: {db_agent.name}",
                reference_id=str(execution_id)
            )
            db.add(transaction)

            print("DEBUG: Committing transaction", flush=True)
            db.commit()
            db.refresh(execution)

            # 5. Run the Agent
            print("DEBUG: Instantiating and running agent", flush=True)
            try:
                agent_instance = AgentClass()
                outputs = agent_instance.run(inputs)

                # 6. Update Execution Record (Success)
                execution.status = ExecutionStatus.COMPLETED
                execution.outputs = outputs
                print("DEBUG: Agent run successful")
                
            except Exception as e:
                # 7. Handle Errors
                print(f"DEBUG: Agent run inner exception: {e}")
                import traceback
                traceback.print_exc()
                execution.status = ExecutionStatus.FAILED
                execution.error_message = str(e)
                
                # OPTIONAL: Refund if we want failures to be free
                # But usually we charge for attempted compute.
                # For this simple implementation, we keep the charge.
                
                # Propagate error to frontend so it displays the reason (e.g. OpenAI Quota)
                # The outer exception handler will catch this and re-raise as HTTPException
                raise e # Re-raise to be caught by the outer except block
            finally:
                db.commit()
                db.refresh(execution)

            return execution

        except HTTPException as he:
            print(f"DEBUG: HTTPException: {he.detail}")
            # Ensure any pending changes are rolled back if an HTTPException occurs before final commit
            db.rollback()
            raise he
        except Exception as e:
            import traceback
            print("DEBUG: OUTER EXCEPTION CAUGHT")
            traceback.print_exc()
            # Ensure any pending changes are rolled back if a general exception occurs
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Internal Execution Error: {str(e)}")
