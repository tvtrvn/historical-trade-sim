"""FastAPI app factory + production entrypoint."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app import __version__
from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.logging import RequestIdMiddleware, configure_logging
from app.core.security import (
    BodySizeLimitMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.schemas.common import HealthResponse


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level="INFO" if settings.is_production else "DEBUG")

    app = FastAPI(
        title="Historical Trade Scenario Simulator API",
        version=__version__,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        default_response_class=ORJSONResponse,
    )

    # ── Middleware order (Starlette: last added = outermost) ───────────────
    # Effective request flow:
    #   SecurityHeaders → CORS → RequestId → RateLimit → BodySize → app
    # That way SecurityHeaders + CORS always run on the response, including
    # short-circuited 413 / 429 / 422 errors from the inner middlewares.
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_body_bytes)
    app.add_middleware(
        RateLimitMiddleware,
        global_per_minute=settings.rate_limit_per_minute,
        heavy_per_minute=settings.heavy_rate_limit_per_minute,
        trust_proxy=settings.trust_proxy,
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Client-Id", "X-Request-Id"],
        expose_headers=["x-request-id"],
        max_age=3600,
    )
    app.add_middleware(SecurityHeadersMiddleware, is_production=settings.is_production)

    install_error_handlers(app)

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", env=settings.env, version=__version__)

    app.include_router(api_router)
    return app


app = create_app()
