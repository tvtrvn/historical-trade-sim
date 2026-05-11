"""Domain errors mapped to a structured JSON envelope.

The frontend speaks one shape: ``{"error": {"code", "message", "field"}}``.
This module also installs a generic 500 fallback so we never accidentally
leak Python tracebacks to clients.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger("api.error")


class AppError(Exception):
    """Domain error with a stable code, http status, and optional field."""

    code: str = "APP_ERROR"
    http_status: int = status.HTTP_400_BAD_REQUEST

    def __init__(self, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.field = field


class NotFoundError(AppError):
    code = "NOT_FOUND"
    http_status = status.HTTP_404_NOT_FOUND


class ValidationError(AppError):
    code = "INVALID_INPUT"
    http_status = status.HTTP_422_UNPROCESSABLE_ENTITY


class InsufficientDataError(AppError):
    code = "INSUFFICIENT_DATA"
    http_status = status.HTTP_422_UNPROCESSABLE_ENTITY


class LimitExceededError(AppError):
    """Raised when a per-client quota (e.g., max saved scenarios) is reached."""

    code = "LIMIT_REACHED"
    http_status = status.HTTP_400_BAD_REQUEST


def _envelope(code: str, message: str, field: str | None = None) -> dict:
    return {"error": {"code": code, "message": message, "field": field}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.http_status, content=_envelope(exc.code, exc.message, exc.field))

    @app.exception_handler(RequestValidationError)
    async def _handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Surface only the first error and never the user-supplied input itself,
        # which Pydantic would otherwise echo back (potential reflection vector).
        first = exc.errors()[0] if exc.errors() else None
        message = "Invalid request payload."
        field: str | None = None
        if first:
            loc = [str(p) for p in first.get("loc", []) if p not in ("body", "query", "path")]
            field = ".".join(loc) if loc else None
            message = first.get("msg") or message
        return JSONResponse(status_code=422, content=_envelope("INVALID_INPUT", message, field))

    @app.exception_handler(Exception)
    async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        # Log the full exception server-side; never to the client.
        log.exception("unhandled exception path=%s method=%s", request.url.path, request.method)
        return JSONResponse(
            status_code=500,
            content=_envelope("INTERNAL_ERROR", "Something went wrong on our end."),
        )
