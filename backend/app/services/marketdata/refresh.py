"""Daily price refresh — keep the catalog up to date.

Called by the GitHub Actions cron (and a CLI for local use). For each
ticker in the catalog:

  1. Find the latest ``price_date`` we already have.
  2. Fetch from ``(latest + 1)`` through today via the marketdata
     fetcher (Tiingo → Stooq → synthetic).
  3. Insert any new rows.

The job is idempotent (re-running pulls 0 new rows), tolerant to per-
ticker failures (one bad symbol does not abort the run), and *never*
deletes existing data — at worst, it's a no-op.

This module is import-light and async so it can be driven by both an HTTP
endpoint (``POST /api/v1/maintenance/refresh-prices``) and a standalone
CLI (``scripts/refresh_prices.py``).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HistoricalPrice, Security
from app.services.marketdata import fetch_history

log = logging.getLogger("marketdata.refresh")


@dataclass
class RefreshReport:
    """Aggregate result of a refresh run, suitable for JSON serialization."""

    started_at: str
    finished_at: str
    duration_ms: int
    symbols_processed: int
    symbols_with_new_data: int
    rows_inserted: int
    per_symbol: list[dict] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "duration_ms": self.duration_ms,
            "symbols_processed": self.symbols_processed,
            "symbols_with_new_data": self.symbols_with_new_data,
            "rows_inserted": self.rows_inserted,
            "per_symbol": self.per_symbol,
            "errors": self.errors,
        }


async def refresh_one(db: AsyncSession, sec: Security) -> tuple[int, str | None]:
    """Refresh a single ticker. Returns ``(rows_inserted, error_or_none)``.

    Caller commits between tickers so a failure mid-batch leaves the
    successful ones persisted.
    """
    latest = (
        await db.execute(
            select(func.max(HistoricalPrice.price_date)).where(
                HistoricalPrice.security_id == sec.id
            )
        )
    ).scalar_one_or_none()

    today = date.today()
    if latest is None:
        # Empty table for this ticker — the *seeder* should have filled
        # it. Refusing to backfill here keeps "refresh = small, fast,
        # incremental" and forces a real catalog issue to surface
        # rather than papering over it with a 16-year fetch on every cron.
        log.warning(
            "refresh: %s has no rows yet — run the seeder first", sec.symbol
        )
        return 0, "empty-history"

    start = latest + timedelta(days=1)
    if start > today:
        return 0, None  # already current

    points = await fetch_history(sec.symbol, start=start, end=today)
    if not points:
        # Saturday/Sunday or holiday → providers genuinely have nothing.
        # Not an error.
        return 0, None

    rows = [
        HistoricalPrice(
            security_id=sec.id,
            price_date=p.price_date,
            close_price=p.close_price,
            adj_close=p.adj_close,
            volume=p.volume,
        )
        for p in points
    ]
    db.add_all(rows)
    await db.commit()
    return len(rows), None


async def refresh_all(db: AsyncSession) -> RefreshReport:
    """Walk every security in the catalog and refresh each.

    Errors on individual tickers are caught and recorded in the report —
    the operator gets a single readable summary at the end rather than
    a partial failure that aborts the whole run.
    """
    from datetime import datetime, timezone

    started = datetime.now(timezone.utc)

    securities = (await db.execute(select(Security).order_by(Security.symbol))).scalars().all()

    per_symbol: list[dict] = []
    errors: list[str] = []
    total_rows = 0
    with_new = 0

    for sec in securities:
        try:
            inserted, err = await refresh_one(db, sec)
        except Exception as exc:  # noqa: BLE001
            log.exception("refresh: unexpected error for %s", sec.symbol)
            per_symbol.append({"symbol": sec.symbol, "inserted": 0, "error": str(exc)})
            errors.append(f"{sec.symbol}: {exc}")
            continue

        per_symbol.append(
            {
                "symbol": sec.symbol,
                "inserted": inserted,
                "error": err,
            }
        )
        total_rows += inserted
        if inserted > 0:
            with_new += 1

    finished = datetime.now(timezone.utc)
    duration_ms = int((finished - started).total_seconds() * 1000)

    log.info(
        "refresh: complete — %d tickers, %d with new data, %d rows in %dms",
        len(securities), with_new, total_rows, duration_ms,
    )

    return RefreshReport(
        started_at=started.isoformat(),
        finished_at=finished.isoformat(),
        duration_ms=duration_ms,
        symbols_processed=len(securities),
        symbols_with_new_data=with_new,
        rows_inserted=total_rows,
        per_symbol=per_symbol,
        errors=errors,
    )
