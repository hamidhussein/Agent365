import logging
from app.models.execution import AgentExecution
from app.models.user import User

logger = logging.getLogger(__name__)

class NotificationService:
    def notify_creator_new_review(self, execution: AgentExecution, creator: User):
        """
        Notify the creator that a user has requested a review.
        """
        # Get username from the relationship, fallback to Guest
        user_name = "Guest User"
        if execution.user:
            user_name = execution.user.username
        elif hasattr(execution, 'user_username') and execution.user_username:
            user_name = execution.user_username

        message = f"NOTIFICATION: Review Requested | Execution ID: {execution.id} | Agent: {execution.agent.name} | User: {user_name} | Note: {execution.review_request_note}"
        logger.info(message)
        print(message) # Ensure it hits stdout for immediate visibility in dev

    def notify_user_review_completed(self, execution: AgentExecution, user: User):
        """
        Notify the user that their review has been completed.
        """
        # Placeholder for email/push notification logic
        message = f"NOTIFICATION: Review Completed | Execution ID: {execution.id} | Agent: {execution.agent.name} | Creator Response: {execution.review_response_note}"
        logger.info(message)
        print(message) # Ensure it hits stdout for immediate visibility in dev

notification_service = NotificationService()
