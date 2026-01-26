import logging
from typing import Optional
from app.models.execution import AgentExecution
from app.models.user import User

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Enhanced notification service with real-time WebSocket support
    """
    
    def __init__(self):
        self._ws_manager = None
        
    def set_websocket_manager(self, ws_manager):
        """Set the WebSocket connection manager (lazy loading to avoid circular imports)"""
        self._ws_manager = ws_manager
        
    async def notify_creator_new_review(self, execution: AgentExecution, creator: User):
        """
        Notify the creator that a user has requested a review.
        Sends both console log and WebSocket real-time update.
        """
        # Get username from the relationship, fallback to Guest
        user_name = "Guest User"
        if execution.user:
            user_name = execution.user.username
        elif hasattr(execution, 'user_username') and execution.user_username:
            user_name = execution.user_username

        message = f"NOTIFICATION: Review Requested | Execution ID: {execution.id} | Agent: {execution.agent.name} | User: {user_name} | Note: {execution.review_request_note}"
        logger.info(message)
        print(message)  # Ensure it hits stdout for immediate visibility in dev
        
        # Send real-time WebSocket notification to creator
        if self._ws_manager:
            from app.websocket.events import build_review_event, WebSocketEvent
            
            ws_message = build_review_event(
                event_type=WebSocketEvent.REVIEW_REQUESTED,
                execution_id=execution.id,
                agent_name=execution.agent.name,
                review_status=execution.review_status.value,
                user_username=user_name,
                additional_data={
                    "review_request_note": execution.review_request_note,
                    "priority": getattr(execution, 'priority', 'normal'),
                }
            )
            
            try:
                await self._ws_manager.send_personal_message(ws_message, str(creator.id))
                logger.info(f"WebSocket notification sent to creator {creator.id}")
            except Exception as e:
                logger.error(f"Failed to send WebSocket notification: {e}")

    async def notify_user_review_completed(self, execution: AgentExecution, user: User):
        """
        Notify the user that their review has been completed.
        Sends both console log and WebSocket real-time update.
        """
        message = f"NOTIFICATION: Review Completed | Execution ID: {execution.id} | Agent: {execution.agent.name} | Creator Response: {execution.review_response_note}"
        logger.info(message)
        print(message)  # Ensure it hits stdout for immediate visibility in dev
        
        # Send real-time WebSocket notification to user
        if self._ws_manager:
            from app.websocket.events import build_review_event, WebSocketEvent
            
            ws_message = build_review_event(
                event_type=WebSocketEvent.REVIEW_COMPLETED,
                execution_id=execution.id,
                agent_name=execution.agent.name,
                review_status=execution.review_status.value,
                additional_data={
                    "review_response_note": execution.review_response_note,
                    "has_refined_outputs": execution.refined_outputs is not None,
                    "reviewed_at": execution.reviewed_at.isoformat() if execution.reviewed_at else None,
                }
            )
            
            try:
                await self._ws_manager.send_personal_message(ws_message, str(user.id))
                logger.info(f"WebSocket notification sent to user {user.id}")
            except Exception as e:
                logger.error(f"Failed to send WebSocket notification: {e}")
    
    async def notify_review_status_changed(
        self, 
        execution: AgentExecution, 
        old_status: str, 
        new_status: str,
        notify_user_id: Optional[str] = None
    ):
        """
        Notify about review status changes (e.g., pending -> in_progress)
        """
        logger.info(f"Review status changed: {execution.id} | {old_status} -> {new_status}")
        
        if self._ws_manager and notify_user_id:
            from app.websocket.events import build_review_event, WebSocketEvent
            
            ws_message = build_review_event(
                event_type=WebSocketEvent.REVIEW_STATUS_CHANGED,
                execution_id=execution.id,
                agent_name=execution.agent.name,
                review_status=new_status,
                additional_data={
                    "old_status": old_status,
                    "new_status": new_status,
                }
            )
            
            try:
                await self._ws_manager.send_personal_message(ws_message, notify_user_id)
            except Exception as e:
                logger.error(f"Failed to send status change notification: {e}")


notification_service = NotificationService()

