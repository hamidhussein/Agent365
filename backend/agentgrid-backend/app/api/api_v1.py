from fastapi import APIRouter

from .v1.endpoints import (
    auth,
    users,
    agent_sharing,
    chat_sessions,
    agent_versions,
    agent_analytics,
    health,
)
from app.api.deployment import router as deployment_router

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(agent_sharing.router, tags=["agent-sharing"])
api_router.include_router(chat_sessions.router, tags=["chat-sessions"])
api_router.include_router(agent_versions.router, tags=["agent-versions"])
api_router.include_router(agent_analytics.router, tags=["agent-analytics"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(deployment_router, prefix="/deploy", tags=["deployment"])
