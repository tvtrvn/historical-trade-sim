"""Orchestrates: load prices → run engine → build response payload.

This module is the glue between the ORM layer and the pure finance engine.
Routes call ``run_simulation_from_input`` (no save) or ``save_and_run`` (save).
"""

from __future__ import annotations

import time
from datetime import date as date_t, datetime, timezone
from decimal import Decimal
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.errors import (
    InsufficientDataError,
    LimitExceededError,
    NotFoundError,
    ValidationError,
)
from app.models import (
    AnnualMetric,
    HistoricalPrice,
    Scenario,
    ScenarioMode,
    ScenarioPosition,
    ScenarioResult,
    Security,
)
from app.schemas.scenario import (
    AnnualMetricOut,
    PositionContribution as PositionContributionSchema,
    PositionOut,
    ScenarioIn,
    ScenarioOut,
    ScenarioResultOut,
    ScenarioResultPayload,
    TimeseriesPoint as TimeseriesPointSchema,
    TradeEvent as TradeEventSchema,
)
from app.services.finance.engine import (
    Leg,
    SimulationInput,
    SimulationOutput,
    simulate,
)
from app.services.finance.metrics import to_decimal


async def _load_prices_for(
    db: AsyncSession, symbols: Iterable[str], start: date_t, end: date_t
) -> dict[str, list[tuple[date_t, float]]]:
    """Return {symbol -> sorted [(date, adj_close)]} for all symbols."""
    symbols = list({s.upper() for s in symbols})
    rows = (
        await db.execute(
            select(HistoricalPrice, Security.symbol)
            .join(Security, Security.id == HistoricalPrice.security_id)
            .where(Security.symbol.in_(symbols))
            .where(HistoricalPrice.price_date >= start)
            .where(HistoricalPrice.price_date <= end)
            .order_by(Security.symbol, HistoricalPrice.price_date.asc())
        )
    ).all()
    out: dict[str, list[tuple[date_t, float]]] = {s: [] for s in symbols}
    for hp, sym in rows:
        out[sym].append((hp.price_date, float(hp.adj_close)))
    missing = [s for s, v in out.items() if not v]
    if missing:
        raise InsufficientDataError(
            f"No price history for: {', '.join(missing)}", field="positions"
        )
    return out


def _build_engine_input(
    scenario_in: ScenarioIn, prices_by_symbol: dict[str, list[tuple[date_t, float]]]
) -> SimulationInput:
    legs = [
        Leg(
            symbol=p.symbol,
            weight_pct=float(p.weight_pct) if scenario_in.mode == ScenarioMode.BASKET else 100.0,
            prices=prices_by_symbol[p.symbol],
        )
        for p in scenario_in.positions
    ]
    bench_prices = prices_by_symbol[scenario_in.benchmark_symbol]
    bench = Leg(symbol=scenario_in.benchmark_symbol, weight_pct=100.0, prices=bench_prices)
    return SimulationInput(
        legs=legs,
        benchmark=bench,
        start_date=scenario_in.start_date,
        end_date=scenario_in.end_date,
        initial_amount=float(scenario_in.initial_amount),
        recurring_amount=float(scenario_in.recurring_amount),
        recurring_freq=scenario_in.recurring_freq.value,
        fees_pct=float(scenario_in.fees_pct),
    )


def _engine_output_to_result_payload(out: SimulationOutput) -> ScenarioResultPayload:
    return ScenarioResultPayload(
        timeseries=[
            TimeseriesPointSchema(
                date=p.date,
                value=to_decimal(p.value, 2),
                invested=to_decimal(p.invested, 2),
                benchmark_value=to_decimal(p.benchmark_value, 2),
                drawdown_pct=to_decimal(p.drawdown_pct, 4),
            )
            for p in out.timeseries
        ],
        trades=[
            TradeEventSchema(
                date=t.date,
                symbol=t.symbol,
                price=to_decimal(t.price, 4),
                shares=to_decimal(t.shares, 6),
                amount=to_decimal(t.amount, 2),
                kind=t.kind,  # type: ignore[arg-type]
            )
            for t in out.trades
        ],
        contributions=[
            PositionContributionSchema(
                symbol=c.symbol,
                weight_pct=to_decimal(c.weight_pct, 4),
                invested=to_decimal(c.invested, 2),
                final_value=to_decimal(c.final_value, 2),
                contribution_pct=to_decimal(c.contribution_pct, 4),
            )
            for c in out.contributions
        ],
    )


# ---------------------------------------------------------------------------
# Public API.
# ---------------------------------------------------------------------------


async def run_simulation_from_input(
    db: AsyncSession, scenario_in: ScenarioIn
) -> ScenarioResultOut:
    """Run a simulation without persisting it. Used by /simulate."""
    t0 = time.perf_counter()
    symbols = [p.symbol for p in scenario_in.positions] + [scenario_in.benchmark_symbol]
    prices = await _load_prices_for(db, symbols, scenario_in.start_date, scenario_in.end_date)
    engine_in = _build_engine_input(scenario_in, prices)
    engine_out = simulate(engine_in)
    if not engine_out.timeseries:
        raise InsufficientDataError(
            "Could not run simulation in the chosen window. Try widening the dates.",
            field="start_date",
        )
    payload = _engine_output_to_result_payload(engine_out)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    return ScenarioResultOut(
        id=0,
        run_at=datetime.now(timezone.utc),
        final_value=to_decimal(engine_out.final_value, 2),
        invested_total=to_decimal(engine_out.invested_total, 2),
        total_return_pct=to_decimal(engine_out.total_return_pct, 4),
        cagr_pct=to_decimal(engine_out.cagr_pct, 4),
        volatility_pct=to_decimal(engine_out.volatility_pct, 4),
        max_drawdown_pct=to_decimal(engine_out.max_drawdown_pct, 4),
        sharpe_like=to_decimal(engine_out.sharpe_like, 4),
        benchmark_final_value=to_decimal(engine_out.benchmark_final_value, 2),
        benchmark_total_return_pct=to_decimal(engine_out.benchmark_total_return_pct, 4),
        benchmark_cagr_pct=to_decimal(engine_out.benchmark_cagr_pct, 4),
        relative_return_pct=to_decimal(engine_out.relative_return_pct, 4),
        annual_metrics=[
            AnnualMetricOut(
                year=y,
                portfolio_return_pct=to_decimal(p, 4),
                benchmark_return_pct=to_decimal(b, 4),
            )
            for y, (p, b) in engine_out.annual.items()
        ],
        payload=payload,
        run_ms=elapsed_ms,
    )


async def save_scenario(
    db: AsyncSession, *, client_id: str, scenario_in: ScenarioIn
) -> Scenario:
    """Persist scenario + positions, then return ORM scenario (not run yet).

    Enforces a per-client cap (anti-spam): ``max_scenarios_per_client``.
    """
    settings = get_settings()
    count = (
        await db.execute(
            select(func.count())
            .select_from(Scenario)
            .where(Scenario.client_id == client_id)
        )
    ).scalar_one()
    if count >= settings.max_scenarios_per_client:
        raise LimitExceededError(
            f"You can have at most {settings.max_scenarios_per_client} saved scenarios. "
            "Delete one before creating another.",
            field="scenarios",
        )

    sc = Scenario(
        client_id=client_id,
        name=scenario_in.name,
        mode=scenario_in.mode,
        benchmark_symbol=scenario_in.benchmark_symbol,
        start_date=scenario_in.start_date,
        end_date=scenario_in.end_date,
        initial_amount=scenario_in.initial_amount,
        recurring_amount=scenario_in.recurring_amount,
        recurring_freq=scenario_in.recurring_freq,
        fees_pct=scenario_in.fees_pct,
        dividend_reinvest=scenario_in.dividend_reinvest,
        positions=[
            ScenarioPosition(symbol=p.symbol, weight_pct=p.weight_pct)
            for p in scenario_in.positions
        ],
    )
    db.add(sc)
    await db.commit()
    await db.refresh(sc, attribute_names=["positions"])
    return sc


def _scenario_to_input(sc: Scenario) -> ScenarioIn:
    from app.schemas.scenario import PositionIn

    return ScenarioIn(
        name=sc.name,
        mode=sc.mode,
        benchmark_symbol=sc.benchmark_symbol,
        start_date=sc.start_date,
        end_date=sc.end_date,
        initial_amount=sc.initial_amount,
        recurring_amount=sc.recurring_amount,
        recurring_freq=sc.recurring_freq,
        fees_pct=sc.fees_pct,
        dividend_reinvest=sc.dividend_reinvest,
        positions=[
            PositionIn(symbol=p.symbol, weight_pct=p.weight_pct) for p in sc.positions
        ],
    )


async def run_and_persist(
    db: AsyncSession, scenario: Scenario
) -> ScenarioResult:
    """Run the engine for a saved scenario and persist the result + annual rows."""
    scenario_in = _scenario_to_input(scenario)
    result_out = await run_simulation_from_input(db, scenario_in)

    sr = ScenarioResult(
        scenario_id=scenario.id,
        run_at=result_out.run_at,
        final_value=result_out.final_value,
        invested_total=result_out.invested_total,
        total_return_pct=result_out.total_return_pct,
        cagr_pct=result_out.cagr_pct,
        volatility_pct=result_out.volatility_pct,
        max_drawdown_pct=result_out.max_drawdown_pct,
        sharpe_like=result_out.sharpe_like,
        benchmark_final_value=result_out.benchmark_final_value,
        benchmark_total_return_pct=result_out.benchmark_total_return_pct,
        benchmark_cagr_pct=result_out.benchmark_cagr_pct,
        relative_return_pct=result_out.relative_return_pct,
        run_ms=result_out.run_ms,
        payload=result_out.payload.model_dump(mode="json"),
        annual_metrics=[
            AnnualMetric(
                year=a.year,
                portfolio_return_pct=a.portfolio_return_pct,
                benchmark_return_pct=a.benchmark_return_pct,
            )
            for a in result_out.annual_metrics
        ],
    )
    db.add(sr)
    await db.commit()
    await db.refresh(sr)
    return sr


async def fetch_scenario_full(
    db: AsyncSession, *, client_id: str, scenario_id: int
) -> Scenario:
    sc = (
        await db.execute(
            select(Scenario)
            .options(selectinload(Scenario.positions), selectinload(Scenario.results).selectinload(ScenarioResult.annual_metrics))
            .where(Scenario.id == scenario_id)
            .where(Scenario.client_id == client_id)
        )
    ).scalar_one_or_none()
    if not sc:
        raise NotFoundError("Scenario not found")
    return sc


def scenario_to_out(sc: Scenario) -> ScenarioOut:
    latest = sc.results[0] if sc.results else None
    latest_out: ScenarioResultOut | None = None
    if latest is not None:
        latest_out = ScenarioResultOut(
            id=latest.id,
            run_at=latest.run_at,
            final_value=latest.final_value,
            invested_total=latest.invested_total,
            total_return_pct=latest.total_return_pct,
            cagr_pct=latest.cagr_pct,
            volatility_pct=latest.volatility_pct,
            max_drawdown_pct=latest.max_drawdown_pct,
            sharpe_like=latest.sharpe_like,
            benchmark_final_value=latest.benchmark_final_value,
            benchmark_total_return_pct=latest.benchmark_total_return_pct,
            benchmark_cagr_pct=latest.benchmark_cagr_pct,
            relative_return_pct=latest.relative_return_pct,
            annual_metrics=[
                AnnualMetricOut(
                    year=a.year,
                    portfolio_return_pct=a.portfolio_return_pct,
                    benchmark_return_pct=a.benchmark_return_pct,
                )
                for a in latest.annual_metrics
            ],
            payload=ScenarioResultPayload.model_validate(latest.payload),
            run_ms=latest.run_ms,
        )
    return ScenarioOut(
        id=sc.id,
        name=sc.name,
        mode=sc.mode,
        benchmark_symbol=sc.benchmark_symbol,
        start_date=sc.start_date,
        end_date=sc.end_date,
        initial_amount=sc.initial_amount,
        recurring_amount=sc.recurring_amount,
        recurring_freq=sc.recurring_freq,
        fees_pct=sc.fees_pct,
        dividend_reinvest=sc.dividend_reinvest,
        created_at=sc.created_at,
        positions=[PositionOut(symbol=p.symbol, weight_pct=p.weight_pct) for p in sc.positions],
        latest_result=latest_out,
    )


def _summary_from_result(r: ScenarioResult) -> dict:
    return {
        "final_value": str(r.final_value),
        "total_return_pct": str(r.total_return_pct),
        "cagr_pct": str(r.cagr_pct),
        "max_drawdown_pct": str(r.max_drawdown_pct),
        "relative_return_pct": str(r.relative_return_pct),
        "run_at": r.run_at.isoformat(),
    }


async def list_scenarios_for_client(
    db: AsyncSession, client_id: str, *, limit: int = 200
) -> list:
    """Return a client's saved scenarios, newest first. Hard-capped at 200."""
    limit = max(1, min(int(limit), 200))
    rows = (
        await db.execute(
            select(Scenario)
            .options(
                selectinload(Scenario.positions),
                selectinload(Scenario.results),
            )
            .where(Scenario.client_id == client_id)
            .order_by(Scenario.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    items = []
    from app.schemas.scenario import ScenarioListItem

    for sc in rows:
        latest = sc.results[0] if sc.results else None
        items.append(
            ScenarioListItem(
                id=sc.id,
                name=sc.name,
                mode=sc.mode,
                benchmark_symbol=sc.benchmark_symbol,
                start_date=sc.start_date,
                end_date=sc.end_date,
                created_at=sc.created_at,
                positions=[PositionOut(symbol=p.symbol, weight_pct=p.weight_pct) for p in sc.positions],
                latest_summary=_summary_from_result(latest) if latest else None,
            )
        )
    return items
