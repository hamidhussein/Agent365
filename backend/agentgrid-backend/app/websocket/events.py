"""
WebSocket Event Types and Message Builders
Defines standardized message formats for real-time events
"""
from typing import Any, Dict, Optional
from datetime import datetime
from uuid import UUID


class WebSocketEvent:
    """Standard event types for WebSocket communication"""
    
    # Review-related events
    REVIEW_REQUESTED = "review_requested"
    REVIEW_STATUS_CHANGED = "review_status_changed"
    REVIEW_COMPLETED = "review_completed"
    REVIEW_IN_PROGRESS = "review_in_progress"
    REVIEW_ASSIGNED = "review_assigned"
    
    # Notification events
    NEW_NOTIFICATION = "new_notification"
    NOTIFICATION_READ = "notification_read"
    
    # System events
    PING = "ping"
    PONG = "pong"
    ERROR = "error"


def build_review_event(
    event_type: str,
    execution_id: UUID,
    agent_name: str,
    review_status: str,
    user_username: Optional[str] = None,
    creator_id: Optional[UUID] = None,
    additional_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Build a standardized review event message"""
    message = {
        "event": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "execution_id": str(execution_id),
            "agent_name": agent_name,
            "review_status": review_status,
        }
    }
    
    if user_username:
        message["data"]["user_username"] = user_username
        
    if creator_id:
        message["data"]["creator_id"] = str(creator_id)
        
    if additional_data:
        message["data"].update(additional_data)
        
    return message


def build_notification_event(
    notification_type: str,
    title: str,
    message: str,
    action_url: Optional[str] = None,
    notification_id: Optional[str] = None
) -> Dict[str, Any]:
    """Build a notification event message"""
    return {
        "event": WebSocketEvent.NEW_NOTIFICATION,
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "notification_id": notification_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "action_url": action_url,
            "read": False
        }
    }


def build_error_event(error_message: str, error_code: Optional[str] = None) -> Dict[str, Any]:
    """Build an error event message"""
    return {
        "event": WebSocketEvent.ERROR,
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "message": error_message,
            "code": error_code or "UNKNOWN_ERROR"
        }
    }


def build_ping_event() -> Dict[str, Any]:
    """Build a ping event for connection health check"""
    return {
        "event": WebSocketEvent.PING,
        "timestamp": datetime.utcnow().isoformat()
    }


def build_pong_event() -> Dict[str, Any]:
    """Build a pong response for connection health check"""
    return {
        "event": WebSocketEvent.PONG,
        "timestamp": datetime.utcnow().isoformat()
    }
