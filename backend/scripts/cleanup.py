"""Manually delete simulation results older than the configured retention.

Usage::

    python scripts/cleanup.py                  # uses RESULT_RETENTION_DAYS (default 30)
    python scripts/cleanup.py --days 7         # one-off override
    python scripts/cleanup.py --dry-run        # report-only, no DELETE

Suitable for a host-level cron job (e.g. systemd timer, Render cron worker)
when an external HTTP scheduler isn't available.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Ensure ``app`` is importable when this script is invoked directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from app.db.base import async_session_factory  # noqa: E402
from app.models import ScenarioResult  # noqa: E402
from app.services.maintenance import cleanup_old_results  # noqa: E402

log = logging.getLogger("cleanup")


async def main(retention_days: int, dry_run: bool) -> int:
    configure_logging("INFO")
    async with async_session_factory() as db:
        if dry_run:
            cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
            candidates = (
                await db.execute(
                    select(func.count())
                    .select_from(ScenarioResult)
                    .where(ScenarioResult.run_at < cutoff)
                )
            ).scalar_one()
            report = {
                "retention_days": retention_days,
                "cutoff": cutoff.isoformat(),
                "candidates": candidates,
                "deleted_results": 0,
                "dry_run": True,
            }
        else:
            r = await cleanup_old_results(db, retention_days=retention_days)
            report = r.to_dict()

    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--days", type=int, default=None,
        help="Override RESULT_RETENTION_DAYS for this invocation.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Report only; no DELETE.")
    args = parser.parse_args()

    days = args.days if args.days is not None else get_settings().result_retention_days
    sys.exit(asyncio.run(main(retention_days=days, dry_run=args.dry_run)))
