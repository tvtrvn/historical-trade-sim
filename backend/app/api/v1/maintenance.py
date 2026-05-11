"""Storage maintenance endpoint — TTL cleanup of old simulation results.

This route is **not** part of the user-facing API. It exists so an external
scheduler (GitHub Actions, cron-job.org, …) can call us once a day to delete
``scenario_results`` rows older than ``RESULT_RETENTION_DAYS``. Authn is a
single shared bearer token compared in constant time.

Why an admin-only HTTP route instead of an in-process scheduler?
  - Koyeb's free tier sleeps the container, so APScheduler would silently
    miss windows.
  - Multi-replica deployments would run the cron N times.
  - An external cron is fully observable (you see HTTP logs, retry, alert).
"""

from __future__ import annotations

import hmac
import logging

from fastapi import APIRouter, Depends, Header, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.base import get_session
from app.services.maintenance import cleanup_old_results

router = APIRouter(prefix="/maintenance", tags=["maintenance"])
log = logging.getLogger("api.maintenance")


def _check_token(authorization: str | None) -> bool:
    """Constant-time bearer-token comparison. Returns True when valid."""
    settings = get_settings()
    expected = settings.maintenance_token
    if not expected:
        return False
    if not authorization or not authorization.lower().startswith("bearer "):
        return False
    presented = authorization.split(" ", 1)[1].strip()
    if not presented:
        return False
    return hmac.compare_digest(presented.encode("utf-8"), expected.encode("utf-8"))


@router.post(
    "/cleanup",
    summary="Delete scenario_results older than RESULT_RETENTION_DAYS",
)
async def cleanup(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: AsyncSession = Depends(get_session),
) -> JSONResponse:
    settings = get_settings()

    # Endpoint is hard-disabled when no token is configured. Returning 503
    # (rather than 401) makes the misconfiguration obvious in monitoring.
    if not settings.maintenance_token:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": {
                    "code": "MAINTENANCE_DISABLED",
                    "message": "MAINTENANCE_TOKEN is not configured.",
                    "field": None,
                }
            },
        )

    if not _check_token(authorization):
        # Don't tell attackers whether the header was missing or just wrong.
        log.warning("maintenance: rejected cleanup attempt (bad token)")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Invalid or missing maintenance token.",
                    "field": None,
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    report = await cleanup_old_results(
        db, retention_days=settings.result_retention_days
    )
    return JSONResponse(status_code=status.HTTP_200_OK, content=report.to_dict())
