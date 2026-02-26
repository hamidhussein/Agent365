from typing import Any, Dict, List
from sqlalchemy.orm import Session

def execute_agent_action(db: Session, action_id: str, arguments: Dict[str, Any]) -> str:
    _ = (db, action_id, arguments)
    return "Dynamic API actions are disabled."

def get_actions_for_agent(db: Session, agent_id: Any) -> List[Any]:
    _ = (db, agent_id)
    return []

def format_action_as_tool(action: Any) -> Dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": "action_disabled",
            "description": "Dynamic API actions are disabled.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }

def format_action_as_gemini_tool(action: Any) -> Dict[str, Any]:
    _ = action
    return {
        "name": "action_disabled",
        "description": "Dynamic API actions are disabled.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }

def format_action_as_anthropic_tool(action: Any) -> Dict[str, Any]:
    _ = action
    return {
        "name": "action_disabled",
        "description": "Dynamic API actions are disabled.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
