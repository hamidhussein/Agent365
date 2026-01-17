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
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Execution-Id"],
    )
    
    app.include_router(api_router, prefix=settings.API_V1_STR)
    app.include_router(creator_studio_router)

    @app.on_event("startup")
    def init_creator_studio() -> None:
        print("Starting init_creator_studio", flush=True)
        db = SessionLocal()
        try:
            print("Seeding LLM configs", flush=True)
            seed_llm_configs(db)
            print("Building vector index", flush=True)
            build_vector_index(db)
            print("init_creator_studio completed", flush=True)
        except Exception as e:
            import traceback
            print(f"Error in init_creator_studio: {e}", flush=True)
            traceback.print_exc()
            # Still re-raise if you want it to fail, but now we'll see WHY
            raise e
        finally:
            db.close()

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
