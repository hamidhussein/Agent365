from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class AgentInput(BaseModel):
    name: str
    type: str  # "string", "number", "boolean", "select"
    description: str
    required: bool = True
    options: Optional[List[str]] = None  # For select type

class AgentOutput(BaseModel):
    name: str
    type: str
    description: str

class BaseAgent(ABC):
    """
    Base class for all AgentGrid agents.
    All manual agents must inherit from this class.
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @property
    @abstractmethod
    def inputs(self) -> List[AgentInput]:
        """Define the inputs this agent expects."""
        pass

    @property
    @abstractmethod
    def outputs(self) -> List[AgentOutput]:
        """Define the outputs this agent produces."""
        pass

    @property
    def price_per_run(self) -> float:
        return 1.0

    @abstractmethod
    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        The main execution logic.
        Args:
            inputs: Dictionary of input values matching the inputs schema.
        Returns:
            Dictionary of output values matching the outputs schema.
        """
        pass
