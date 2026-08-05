from fastapi import FastAPI

from app.api.router import router as api_router
from app.core import configure_logging, settings
from app.core.lifespan import lifespan
from app.exceptions import register_exception_handlers


def create_app() -> FastAPI:
    configure_logging()

    application = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )
    register_exception_handlers(application)
    application.include_router(api_router)
    return application


app = create_app()
