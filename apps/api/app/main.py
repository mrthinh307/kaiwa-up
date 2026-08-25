from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import router as api_router
from app.core import configure_logging, settings
from app.core.lifespan import lifespan
from app.exceptions import register_exception_handlers


def create_app() -> FastAPI:
    configure_logging()
    is_production = settings.environment == "production"

    application = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        docs_url=None if is_production else "/docs",
        lifespan=lifespan,
        openapi_url=None if is_production else "/openapi.json",
        redoc_url=None if is_production else "/redoc",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(application)
    application.include_router(api_router)

    if not is_production:
        storage_path = Path(settings.STORAGE_DIR)
        storage_path.mkdir(parents=True, exist_ok=True)
        application.mount("/static", StaticFiles(directory=str(storage_path)), name="static")

    return application


app = create_app()
