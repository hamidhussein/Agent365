from fastapi import APIRouter

from app.api.v1.endpoints import agents, auth, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(agents.router)
