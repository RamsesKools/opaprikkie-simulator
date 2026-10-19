from fastapi import APIRouter, FastAPI
from pydantic import BaseModel

from opaprikkie import __version__
from opaprikkie.backend.settings import Settings
from opaprikkie.backend.spa import mount_spa


class Health(BaseModel):
    version: str
    dev_mode: bool


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(
        title="Opa Prikkie",
        version=__version__,
        docs_url="/docs" if settings.dev_mode else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.dev_mode else None,
    )
    app.state.settings = settings
    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> Health:
        return Health(version=__version__, dev_mode=settings.dev_mode)

    app.include_router(api)
    # Keep last: the `/` mount shadows any route added after it.
    mount_spa(app, settings.static_dir)
    return app
