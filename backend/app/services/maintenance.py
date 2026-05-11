"""Storage TTL — periodically delete old simulation results.

`scenario_results.payload` is a dense JSON time series, so it's the only
table that can grow meaningfully. Saved scenarios themselves stay forever
— the user can re-run them at any time.

This module is invoked from two places:
1. ``POST /api/v1/maintenance/cleanup`` — bearer-token-protected admin route,
   intended to be hit by an external scheduler (GitHub Actions, cron-job.org,
   UptimeRobot's keyword monitor, …).
2. ``scripts/cleanup.py`` — CLI for local / manual runs.

Deleting a ``ScenarioResult`` cascades to its ``annual_metrics`` rows via
``ondelete="CASCADE"`` on the foreign key.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ScenarioResult

log = logging.getLogger("maintenance")


@dataclass(frozen=True)
class CleanupReport:
    retention_days: int
    cutoff: datetime
    candidates: int
    deleted_results: int

    def to_dict(self) -> dict:
        return {
            "retention_days": self.retention_days,
            "cutoff": self.cutoff.isoformat(),
            "candidates": self.candidates,
            "deleted_results": self.deleted_results,
        }


async def cleanup_old_results(
    db: AsyncSession, *, retention_days: int = 30
) -> CleanupReport:
    """Delete every ``ScenarioResult`` whose ``run_at`` is older than the
    retention window. Returns a report; idempotent (running twice does
    nothing the second time)."""
    if retention_days < 1:
        raise ValueError("retention_days must be >= 1")

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    # Count first so we can report exact numbers even on engines whose DELETE
    # rowcount is unreliable (e.g. some SQLite configurations).
    candidates = (
        await db.execute(
            select(func.count())
            .select_from(ScenarioResult)
            .where(ScenarioResult.run_at < cutoff)
        )
    ).scalar_one()

    if candidates == 0:
        log.info("cleanup: nothing to delete (retention=%dd, cutoff=%s)",
                 retention_days, cutoff.isoformat())
        return CleanupReport(
            retention_days=retention_days,
            cutoff=cutoff,
            candidates=0,
            deleted_results=0,
        )

    result = await db.execute(
        delete(ScenarioResult).where(ScenarioResult.run_at < cutoff)
    )
    await db.commit()

    deleted = result.rowcount if result.rowcount is not None else candidates
    log.info(
        "cleanup: deleted=%d candidates=%d retention=%dd cutoff=%s",
        deleted, candidates, retention_days, cutoff.isoformat(),
    )
    return CleanupReport(
        retention_days=retention_days,
        cutoff=cutoff,
        candidates=candidates,
        deleted_results=deleted,
    )
