from typing import Dict, Type
from app.agents.base import BaseAgent

# Registry to map Agent IDs (UUIDs) to their Python classes
# Format: { "agent_uuid": AgentClass }
AGENT_REGISTRY: Dict[str, Type[BaseAgent]] = {}

def register_agent(agent_id: str):
    """Decorator to register an agent class with a specific ID."""
    def decorator(cls):
        AGENT_REGISTRY[agent_id] = cls
        return cls
    return decorator

def get_agent_class(agent_id: str) -> Type[BaseAgent]:
    return AGENT_REGISTRY.get(str(agent_id))
