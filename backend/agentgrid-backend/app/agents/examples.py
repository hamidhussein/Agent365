from typing import Dict, Any, List
from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent

# Replace this UUID with the actual ID from your database after you create the agent entry
# For now, we use a placeholder. You MUST update this after seeding the DB.
ECHO_AGENT_ID = "00000000-0000-0000-0000-000000000001"

@register_agent(ECHO_AGENT_ID)
class EchoAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "Echo Agent"

    @property
    def description(self) -> str:
        return "A simple agent that echoes back your input."

    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(
                name="message",
                type="string",
                description="The message to echo back."
            )
        ]

    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(
                name="response",
                type="string",
                description="The echoed message."
            )
        ]

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        message = inputs.get("message", "")
        return {
            "response": f"Echo: {message}"
        }
