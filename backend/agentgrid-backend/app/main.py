from fastapi import FastAPI

from app.api.api_v1 import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)
    app.include_router(api_router, prefix=settings.API_V1_STR)
    return app


app = create_app()
