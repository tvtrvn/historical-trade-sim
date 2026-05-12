"""Idempotent seeding for the catalog + historical prices + sample scenarios.

Prices come from the tiered market-data fetcher (``app.services.marketdata``):
Tiingo → Stooq → synthetic GBM. The seeder doesn't care which source actually
served the data; it just persists whatever the orchestrator returns.
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import (
    Benchmark,
    HistoricalPrice,
    RecurringFrequency,
    Scenario,
    ScenarioMode,
    ScenarioPosition,
    Security,
)
from app.services.marketdata import fetch_history
from app.services.seed.data import BENCHMARKS, SECURITIES
from app.services.simulator import run_and_persist

log = logging.getLogger("seed")

DEMO_CLIENT_ID = "demo-client-0000"


async def is_seeded(db: AsyncSession) -> bool:
    """True only when **all three** seed layers are present.

    Checking just the catalog (the original implementation) lets a
    partially-failed seed appear "done", which then prevents the missing
    layer from ever being retried — exactly what bit us on the first Neon
    deploy (demo scenarios crashed after the catalog had committed). Each
    underlying seed function is independently idempotent, so erring on the
    side of "not seeded" is cheap.
    """
    has_security = (await db.execute(select(Security).limit(1))).scalar_one_or_none() is not None
    has_price = (await db.execute(select(HistoricalPrice).limit(1))).scalar_one_or_none() is not None
    has_demo = (
        await db.execute(
            select(Scenario).where(Scenario.client_id == DEMO_CLIENT_ID).limit(1)
        )
    ).scalar_one_or_none() is not None
    return has_security and has_price and has_demo


async def seed_catalog(db: AsyncSession) -> dict[str, Security]:
    out: dict[str, Security] = {}
    for spec in SECURITIES:
        existing = (
            await db.execute(select(Security).where(Security.symbol == spec.symbol))
        ).scalar_one_or_none()
        if existing:
            out[spec.symbol] = existing
            continue
        s = Security(
            symbol=spec.symbol,
            name=spec.name,
            exchange=spec.exchange,
            asset_class=spec.asset_class,
            logo_url=spec.logo_url,
        )
        db.add(s)
        out[spec.symbol] = s
    await db.flush()

    for sym, name, desc in BENCHMARKS:
        existing = (
            await db.execute(select(Benchmark).where(Benchmark.symbol == sym))
        ).scalar_one_or_none()
        if existing:
            continue
        s = out.get(sym)
        db.add(
            Benchmark(
                symbol=sym, name=name, description=desc, logo_url=s.logo_url if s else None
            )
        )
    await db.commit()
    return out


async def seed_prices(db: AsyncSession, securities: dict[str, Security]) -> None:
    """Backfill the full historical window for every ticker in the catalog.

    Idempotent at the per-ticker grain: a ticker that already has *any*
    price row is skipped unless ``MARKETDATA_FORCE_REFRESH=true``, which
    is the explicit "wipe and re-pull from the API" knob (used once when
    upgrading from synthetic to real data on an already-populated DB).
    """
    settings = get_settings()
    start = date.fromisoformat(settings.marketdata_history_start)
    end = date.today()
    force = settings.marketdata_force_refresh

    for spec in SECURITIES:
        sec = securities[spec.symbol]
        any_row = (
            await db.execute(
                select(HistoricalPrice).where(HistoricalPrice.security_id == sec.id).limit(1)
            )
        ).scalar_one_or_none()

        if any_row and not force:
            log.info("prices already seeded for %s, skipping", spec.symbol)
            continue

        if any_row and force:
            log.warning("MARKETDATA_FORCE_REFRESH=true — wiping existing prices for %s", spec.symbol)
            await db.execute(
                HistoricalPrice.__table__.delete().where(HistoricalPrice.security_id == sec.id)
            )
            await db.flush()

        log.info("fetching prices for %s (%s → %s)", spec.symbol, start, end)
        points = await fetch_history(spec.symbol, start=start, end=end)
        if not points:
            # Even the synthetic provider returns rows for everything in
            # SECURITIES, so an empty result here is a real surprise —
            # surface it loudly but keep going so one bad ticker doesn't
            # block the rest of the seed.
            log.error("no price data available for %s — skipping (chart will be empty)", spec.symbol)
            continue

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
        BATCH = 1000
        for i in range(0, len(rows), BATCH):
            db.add_all(rows[i : i + BATCH])
            await db.flush()
        await db.commit()


async def seed_demo_scenarios(db: AsyncSession) -> None:
    existing = (
        await db.execute(select(Scenario).where(Scenario.client_id == DEMO_CLIENT_ID))
    ).scalars().first()
    if existing:
        log.info("demo scenarios already seeded")
        return

    demos = [
        Scenario(
            client_id=DEMO_CLIENT_ID,
            name="AAPL since 2011",
            mode=ScenarioMode.SINGLE,
            benchmark_symbol="SPY",
            start_date=date(2011, 1, 3),
            end_date=date(2026, 4, 29),
            initial_amount=Decimal("10000"),
            recurring_amount=Decimal("0"),
            recurring_freq=RecurringFrequency.NONE,
            fees_pct=Decimal("0"),
            dividend_reinvest=True,
            positions=[ScenarioPosition(symbol="AAPL", weight_pct=Decimal("100"))],
        ),
        Scenario(
            client_id=DEMO_CLIENT_ID,
            name="$500/mo into SPY (2015 → today)",
            mode=ScenarioMode.SINGLE,
            benchmark_symbol="QQQ",
            start_date=date(2015, 1, 2),
            end_date=date(2026, 4, 29),
            initial_amount=Decimal("0"),
            recurring_amount=Decimal("500"),
            recurring_freq=RecurringFrequency.MONTHLY,
            fees_pct=Decimal("0"),
            dividend_reinvest=True,
            positions=[ScenarioPosition(symbol="SPY", weight_pct=Decimal("100"))],
        ),
        Scenario(
            client_id=DEMO_CLIENT_ID,
            name="Mag-Five basket — 2016",
            mode=ScenarioMode.BASKET,
            benchmark_symbol="SPY",
            start_date=date(2016, 1, 4),
            end_date=date(2026, 4, 29),
            initial_amount=Decimal("25000"),
            recurring_amount=Decimal("0"),
            recurring_freq=RecurringFrequency.NONE,
            fees_pct=Decimal("0"),
            dividend_reinvest=True,
            positions=[
                ScenarioPosition(symbol="AAPL", weight_pct=Decimal("25")),
                ScenarioPosition(symbol="MSFT", weight_pct=Decimal("25")),
                ScenarioPosition(symbol="GOOGL", weight_pct=Decimal("20")),
                ScenarioPosition(symbol="AMZN", weight_pct=Decimal("20")),
                ScenarioPosition(symbol="NVDA", weight_pct=Decimal("10")),
            ],
        ),
    ]
    for s in demos:
        db.add(s)
    await db.commit()

    for s in demos:
        await db.refresh(s, attribute_names=["positions"])
        await run_and_persist(db, s)
        log.info("seeded scenario: %s", s.name)
