import json
import httpx
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.models.creator_studio import AgentAction

def execute_agent_action(db: Session, action_id: str, arguments: Dict[str, Any]) -> str:
    """
    Executes a dynamic action by performing an HTTP request to its configured URL.
    """
    action = db.query(AgentAction).filter(AgentAction.id == action_id).first()
    if not action:
        return f"Error: Action {action_id} not found."

    url = action.url
    method = action.method.upper()
    headers = action.headers or {}
    
    # Ensure Content-Type is set for POST/PUT
    if method in ["POST", "PUT", "PATCH"] and "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"

    try:
        with httpx.Client(timeout=30.0) as client:
            if method == "GET":
                response = client.get(url, params=arguments, headers=headers)
            elif method == "POST":
                response = client.post(url, json=arguments, headers=headers)
            elif method == "PUT":
                response = client.put(url, json=arguments, headers=headers)
            elif method == "DELETE":
                response = client.delete(url, params=arguments, headers=headers)
            else:
                return f"Error: Unsupported HTTP method {method}"

            response.raise_for_status()
            
            # Try to return pretty-formatted JSON if possible
            try:
                return json.dumps(response.json(), indent=2)
            except:
                return response.text

    except httpx.HTTPStatusError as e:
        return f"API Error ({e.response.status_code}): {e.response.text}"
    except Exception as e:
        return f"Execution Error: {str(e)}"

def get_actions_for_agent(db: Session, agent_id: Any) -> List[AgentAction]:
    """
    Returns all dynamic actions configured for a specific agent.
    """
    return db.query(AgentAction).filter(AgentAction.agent_id == agent_id).all()

def format_action_as_tool(action: AgentAction) -> Dict[str, Any]:
    """
    Converts an AgentAction model into an OpenAI-compatible tool definition.
    """
    return {
        "type": "function",
        "function": {
            "name": f"action_{str(action.id).replace('-', '_')}", # Use ID to avoid name collisions
            "description": f"{action.description} (Internal name: {action.name})",
            "parameters": action.openapi_spec or {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }

def format_action_as_gemini_tool(action: AgentAction) -> Dict[str, Any]:
    """
    Converts an AgentAction model into a Google GenAI function declaration.
    """
    return {
        "name": f"action_{str(action.id).replace('-', '_')}",
        "description": f"{action.description} (Internal name: {action.name})",
        "parameters": action.openapi_spec or {
            "type": "object",
            "properties": {},
            "required": []
        }
    }

def format_action_as_anthropic_tool(action: AgentAction) -> Dict[str, Any]:
    """
    Converts an AgentAction model into an Anthropic tool definition.
    """
    return {
        "name": f"action_{str(action.id).replace('-', '_')}",
        "description": f"{action.description} (Internal name: {action.name})",
        "input_schema": action.openapi_spec or {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
