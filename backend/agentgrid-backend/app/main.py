from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.api_v1 import api_router
from app.core.config import get_settings
import app.agents # Register agents

from app.api.creator_studio import router as creator_studio_router
from app.db.session import SessionLocal
from app.services.creator_studio import build_vector_index, seed_llm_configs


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, debug=True)
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001", # Sometimes users might use other ports
            "http://localhost:3002",
            "http://172.29.192.1:3000",
            "http://172.29.192.1:3001",
            "http://172.29.192.1:3002",
        ],
        # Allow dev clients hosted on local IPs (e.g., WSL/VM bridge) and common ports.
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3}):300[0-9]$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Execution-Id"],
    )
    
    app.include_router(api_router, prefix=settings.API_V1_STR)
    app.include_router(creator_studio_router)

    @app.on_event("startup")
    def init_creator_studio() -> None:
        print("[STARTUP] Entering init_creator_studio", flush=True)
        db = SessionLocal()
        try:
            print("[STARTUP] Seeding LLM configs...", flush=True)
            seed_llm_configs(db)
            print("[STARTUP] LLM configs seeded.", flush=True)
            
            print("[STARTUP] Building vector index...", flush=True)
            build_vector_index(db)
            print("[STARTUP] Vector index build check complete.", flush=True)
            
            # Initialize WebSocket notification integration
            print("[STARTUP] Initializing WebSocket notification service...", flush=True)
            from app.websocket.connection_manager import connection_manager
            from app.services.notification import notification_service
            notification_service.set_websocket_manager(connection_manager)
            print("[STARTUP] WebSocket services initialized.", flush=True)
            
            print("[STARTUP] init_creator_studio finished successfully", flush=True)
        except Exception as e:
            import traceback
            print(f"[STARTUP] FATAL ERROR during initialization: {e}", flush=True)
            traceback.print_exc()
            # Do NOT raise here, let the app start even if one service fails
            # This prevents total deadlock on port 8000
        finally:
            db.close()
            print("[STARTUP] DB connection closed", flush=True)

    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        import traceback
        print(f"Global Exception: {exc}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(exc)},
        )

    return app


app = create_app()
