from fastapi import APIRouter

from app.api.v1.endpoints import agents, auth, health, reviews, executions, credits, users, websocket

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(executions.router, tags=["executions"])
api_router.include_router(credits.router, tags=["credits"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(websocket.router, tags=["websocket"])
api_router.include_router(health.router, tags=["health"])
