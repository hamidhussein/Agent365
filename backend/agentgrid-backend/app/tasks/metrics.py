"""
Background tasks for metrics aggregation
"""
from datetime import date, datetime, timedelta
from sqlalchemy import func
from app.tasks import celery_app
from app.db.session import SessionLocal
from app.models.agent import Agent
from app.models.agent_metrics import AgentMetrics, LLMUsage
from app.models.execution import AgentExecution
from app.models.enums import ExecutionStatus


@celery_app.task
def aggregate_daily_metrics():
    """
    Aggregate daily metrics for all agents.
    
    Runs hourly to keep metrics up-to-date.
    """
    db = SessionLocal()
    try:
        yesterday = date.today() - timedelta(days=1)
        
        # Get all agents
        agents = db.query(Agent).all()
        
        for agent in agents:
            # Check if metrics already exist for yesterday
            existing = db.query(AgentMetrics).filter(
                AgentMetrics.agent_id == agent.id,
                AgentMetrics.date == yesterday
            ).first()
            
            if existing:
                continue  # Skip if already aggregated
            
            # Calculate metrics
            metrics_data = calculate_agent_metrics(db, agent.id, yesterday)
            
            # Create metrics record
            metrics = AgentMetrics(
                agent_id=agent.id,
                date=yesterday,
                **metrics_data
            )
            
            db.add(metrics)
        
        db.commit()
        
        return {
            "status": "success",
            "agents_processed": len(agents),
            "date": yesterday.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        raise e
        
    finally:
        db.close()


def calculate_agent_metrics(db, agent_id, target_date: date) -> dict:
    """
    Calculate all metrics for an agent on a specific date.
    """
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())
    
    # Query executions for the day
    executions = db.query(AgentExecution).filter(
        AgentExecution.agent_id == agent_id,
        AgentExecution.created_at.between(start_dt, end_dt)
    ).all()
    
    if not executions:
        return {
            "total_chats": 0,
            "total_messages": 0,
            "unique_users": 0,
            "avg_response_time_ms": 0,
            "p95_response_time_ms": 0,
            "error_rate": 0.0,
            "web_search_calls": 0,
            "code_execution_calls": 0,
            "rag_queries": 0,
            "avg_rag_confidence": 0.0,
            "context_coverage_full": 0,
            "context_coverage_partial": 0,
            "context_coverage_none": 0,
            "total_cost_usd": 0.0
        }
    
    # Usage metrics
    total_messages = len(executions)
    unique_users = len(set(e.user_id for e in executions if e.user_id))
    
    # Performance metrics
    response_times = [
        (e.updated_at - e.created_at).total_seconds() * 1000
        for e in executions
        if e.updated_at and e.created_at
    ]
    avg_response_time = int(sum(response_times) / len(response_times)) if response_times else 0
    
    # P95 response time
    if response_times:
        sorted_times = sorted(response_times)
        p95_index = int(len(sorted_times) * 0.95)
        p95_response_time = int(sorted_times[p95_index])
    else:
        p95_response_time = 0
    
    # Error rate
    failed_count = sum(1 for e in executions if e.status == ExecutionStatus.FAILED)
    error_rate = failed_count / total_messages if total_messages > 0 else 0.0
    
    # Capability usage (would need to track in execution metadata)
    web_search_calls = 0
    code_execution_calls = 0
    rag_queries = 0
    
    # Cost
    cost_result = db.query(func.sum(LLMUsage.cost_usd)).filter(
        LLMUsage.agent_id == agent_id,
        func.date(LLMUsage.created_at) == target_date
    ).scalar()
    total_cost = float(cost_result) if cost_result else 0.0
    
    return {
        "total_chats": unique_users,  # Approximate
        "total_messages": total_messages,
        "unique_users": unique_users,
        "avg_response_time_ms": avg_response_time,
        "p95_response_time_ms": p95_response_time,
        "error_rate": error_rate,
        "web_search_calls": web_search_calls,
        "code_execution_calls": code_execution_calls,
        "rag_queries": rag_queries,
        "avg_rag_confidence": 0.0,  # Would need to track
        "context_coverage_full": 0,
        "context_coverage_partial": 0,
        "context_coverage_none": 0,
        "total_cost_usd": total_cost
    }
