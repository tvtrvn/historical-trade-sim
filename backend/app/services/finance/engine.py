"""Pure simulation engine.

Inputs are plain Python primitives so the engine can be tested without the
ORM. The wrapper in ``app.services.simulator`` is responsible for loading
prices from Postgres and persisting results.

Core idea
---------
Given:
  * one or more positions, each with a target weight,
  * a price series per position (date -> price),
  * an investment policy (initial amount + optional recurring contributions),

we simulate the daily portfolio value by:
  1) Resolving the actual buy date (forward-fill weekends/holidays).
  2) Allocating capital pro-rata to each leg's weight.
  3) Computing shares per leg from amount/price (minus optional fees).
  4) For each subsequent trading day, value = sum_i shares_i * price_i(t).
  5) Recurring contributions add to ``invested`` and buy more shares at the
     resolved date's price (pro-rata across legs).

The benchmark series uses the same engine: a single-position scenario priced
against the benchmark symbol with the same investment policy, then re-based
to dollar terms for comparison.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Iterable

from app.services.finance.dates import iter_recurring_dates, nearest_on_or_after
from app.services.finance.metrics import (
    annual_returns,
    cagr,
    drawdown_series,
    max_drawdown,
    sharpe_like,
    total_return,
    volatility_annualized,
)


# ---------------------------------------------------------------------------
# Inputs / outputs as plain dataclasses (engine stays ORM-free).
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Leg:
    symbol: str
    weight_pct: float
    prices: list[tuple[date, float]]  # sorted ascending by date


@dataclass(frozen=True)
class SimulationInput:
    legs: list[Leg]
    benchmark: Leg
    start_date: date
    end_date: date
    initial_amount: float
    recurring_amount: float = 0.0
    recurring_freq: str = "none"  # "none" | "monthly" | "quarterly"
    fees_pct: float = 0.0  # percent (0.05 means 5 bps applied per buy)


@dataclass
class TradeEvent:
    date: date
    symbol: str
    price: float
    shares: float
    amount: float
    kind: str  # "initial" | "recurring"


@dataclass
class TimeseriesPoint:
    date: date
    value: float
    invested: float
    benchmark_value: float
    drawdown_pct: float


@dataclass
class PositionContribution:
    symbol: str
    weight_pct: float
    invested: float
    final_value: float
    contribution_pct: float


@dataclass
class SimulationOutput:
    timeseries: list[TimeseriesPoint] = field(default_factory=list)
    trades: list[TradeEvent] = field(default_factory=list)
    contributions: list[PositionContribution] = field(default_factory=list)
    annual: dict[int, tuple[float, float]] = field(default_factory=dict)

    final_value: float = 0.0
    invested_total: float = 0.0
    total_return_pct: float = 0.0
    cagr_pct: float = 0.0
    volatility_pct: float = 0.0
    max_drawdown_pct: float = 0.0
    max_drawdown_idx: int = 0
    sharpe_like: float = 0.0

    benchmark_final_value: float = 0.0
    benchmark_total_return_pct: float = 0.0
    benchmark_cagr_pct: float = 0.0
    relative_return_pct: float = 0.0


# ---------------------------------------------------------------------------
# Engine.
# ---------------------------------------------------------------------------


def _series_to_map(prices: list[tuple[date, float]]) -> tuple[list[date], dict[date, float]]:
    sorted_dates = [d for d, _ in prices]
    return sorted_dates, {d: p for d, p in prices}


def _trim_series(
    prices: list[tuple[date, float]], start: date, end: date
) -> list[tuple[date, float]]:
    return [(d, p) for d, p in prices if start <= d <= end]


def _normalize_weights(legs: Iterable[Leg]) -> list[Leg]:
    legs = list(legs)
    total = sum(l.weight_pct for l in legs)
    if total <= 0:
        return [Leg(l.symbol, 100.0 / len(legs), l.prices) for l in legs]
    return [Leg(l.symbol, l.weight_pct * (100.0 / total), l.prices) for l in legs]


def _buy(
    *,
    leg_dates: dict[str, list[date]],
    leg_maps: dict[str, dict[date, float]],
    target: date,
    cash: float,
    legs: list[Leg],
    fees_pct: float,
    kind: str,
    holdings: dict[str, float],
    invested_per_leg: dict[str, float],
    trades: list[TradeEvent],
) -> tuple[float, date | None]:
    """Resolve the buy date and execute a pro-rata buy across all legs.

    Returns (cash_invested, resolved_date). If even one leg has no price within
    the forward-fill window, the buy is skipped (cash_invested = 0).
    """
    resolved_per_leg: dict[str, date] = {}
    for leg in legs:
        d = nearest_on_or_after(leg_dates[leg.symbol], target)
        if d is None:
            return 0.0, None
        resolved_per_leg[leg.symbol] = d
    resolved = max(resolved_per_leg.values())

    fee_factor = max(0.0, 1.0 - fees_pct / 100.0)
    invested_dollars = 0.0
    for leg in legs:
        share_amount = cash * (leg.weight_pct / 100.0) * fee_factor
        if share_amount <= 0:
            continue
        price = leg_maps[leg.symbol][resolved_per_leg[leg.symbol]]
        if price <= 0:
            continue
        shares = share_amount / price
        holdings[leg.symbol] = holdings.get(leg.symbol, 0.0) + shares
        invested_per_leg[leg.symbol] = invested_per_leg.get(leg.symbol, 0.0) + share_amount
        invested_dollars += share_amount
        trades.append(
            TradeEvent(
                date=resolved_per_leg[leg.symbol],
                symbol=leg.symbol,
                price=price,
                shares=shares,
                amount=share_amount,
                kind=kind,
            )
        )
    return invested_dollars, resolved


def _portfolio_value_series(
    *,
    legs: list[Leg],
    leg_maps: dict[str, dict[date, float]],
    union_dates: list[date],
    holdings_over_time: list[dict[str, float]],
) -> list[float]:
    """Given holdings at each union date, compute the portfolio's value series."""
    last_known_price: dict[str, float] = {}
    out: list[float] = []
    for i, d in enumerate(union_dates):
        v = 0.0
        for leg in legs:
            price = leg_maps[leg.symbol].get(d, last_known_price.get(leg.symbol, 0.0))
            if price > 0:
                last_known_price[leg.symbol] = price
            shares = holdings_over_time[i].get(leg.symbol, 0.0)
            v += shares * price
        out.append(v)
    return out


def simulate(inp: SimulationInput) -> SimulationOutput:
    """Run a full simulation and return a pure dataclass output."""
    out = SimulationOutput()

    legs = _normalize_weights(inp.legs)

    # Trim each leg's price series to the period of interest.
    trimmed_legs = [Leg(l.symbol, l.weight_pct, _trim_series(l.prices, inp.start_date, inp.end_date)) for l in legs]
    bench = Leg(
        inp.benchmark.symbol,
        100.0,
        _trim_series(inp.benchmark.prices, inp.start_date, inp.end_date),
    )
    if not all(l.prices for l in trimmed_legs) or not bench.prices:
        return out  # caller is expected to surface a friendly error

    leg_dates: dict[str, list[date]] = {l.symbol: [d for d, _ in l.prices] for l in trimmed_legs}
    leg_maps: dict[str, dict[date, float]] = {
        l.symbol: dict(l.prices) for l in trimmed_legs
    }
    bench_dates, bench_map = _series_to_map(bench.prices)

    holdings: dict[str, float] = {}
    invested_per_leg: dict[str, float] = {}
    trades: list[TradeEvent] = []
    invested_total = 0.0

    # Initial buy.
    if inp.initial_amount > 0:
        invested, _ = _buy(
            leg_dates=leg_dates,
            leg_maps=leg_maps,
            target=inp.start_date,
            cash=inp.initial_amount,
            legs=trimmed_legs,
            fees_pct=inp.fees_pct,
            kind="initial",
            holdings=holdings,
            invested_per_leg=invested_per_leg,
            trades=trades,
        )
        invested_total += invested

    # Recurring contributions.
    recurring_dates = iter_recurring_dates(
        inp.start_date,
        inp.end_date,
        inp.recurring_freq,
        anchor=inp.start_date,
    ) if inp.recurring_amount > 0 else []
    # Skip the very first recurring date if we already did the initial buy.
    skip_first = inp.initial_amount > 0
    for i, target in enumerate(recurring_dates):
        if i == 0 and skip_first:
            continue
        invested, _ = _buy(
            leg_dates=leg_dates,
            leg_maps=leg_maps,
            target=target,
            cash=inp.recurring_amount,
            legs=trimmed_legs,
            fees_pct=inp.fees_pct,
            kind="recurring",
            holdings=holdings,
            invested_per_leg=invested_per_leg,
            trades=trades,
        )
        invested_total += invested

    if not trades:
        return out

    # ----- Build the union-of-dates time series -----
    all_dates_set = set()
    for l in trimmed_legs:
        all_dates_set.update(leg_dates[l.symbol])
    all_dates_set.update(bench_dates)
    union_dates = sorted(d for d in all_dates_set if trades[0].date <= d <= inp.end_date)
    if not union_dates:
        return out

    # Holdings at each date evolve as more trades occur. Build a per-date
    # snapshot by walking trades in order.
    sorted_trades = sorted(trades, key=lambda t: t.date)
    holdings_over_time: list[dict[str, float]] = []
    invested_over_time: list[float] = []
    cur_holdings: dict[str, float] = {}
    cur_invested = 0.0
    ti = 0
    for d in union_dates:
        while ti < len(sorted_trades) and sorted_trades[ti].date <= d:
            t = sorted_trades[ti]
            cur_holdings[t.symbol] = cur_holdings.get(t.symbol, 0.0) + t.shares
            cur_invested += t.amount
            ti += 1
        holdings_over_time.append(dict(cur_holdings))
        invested_over_time.append(cur_invested)

    portfolio_values = _portfolio_value_series(
        legs=trimmed_legs,
        leg_maps=leg_maps,
        union_dates=union_dates,
        holdings_over_time=holdings_over_time,
    )

    # ----- Benchmark with the *same* deposit schedule -----
    bench_holdings = 0.0
    bench_invested = 0.0
    bench_trade_dates: list[tuple[date, float, float]] = []  # (resolved, shares, amount)
    bench_dates_list = bench_dates  # already sorted

    def _bench_buy(target: date, cash: float) -> None:
        nonlocal bench_holdings, bench_invested
        d = nearest_on_or_after(bench_dates_list, target)
        if d is None:
            return
        price = bench_map[d]
        if price <= 0:
            return
        amt = cash * max(0.0, 1.0 - inp.fees_pct / 100.0)
        shares = amt / price
        bench_holdings += shares
        bench_invested += amt
        bench_trade_dates.append((d, shares, amt))

    if inp.initial_amount > 0:
        _bench_buy(inp.start_date, inp.initial_amount)
    for i, target in enumerate(recurring_dates):
        if i == 0 and skip_first:
            continue
        _bench_buy(target, inp.recurring_amount)

    bench_values: list[float] = []
    last_b_price = bench.prices[0][1] if bench.prices else 0.0
    cur_b_holdings = 0.0
    bi = 0
    sorted_b_trades = sorted(bench_trade_dates, key=lambda x: x[0])
    for d in union_dates:
        while bi < len(sorted_b_trades) and sorted_b_trades[bi][0] <= d:
            cur_b_holdings += sorted_b_trades[bi][1]
            bi += 1
        price = bench_map.get(d, last_b_price)
        if price > 0:
            last_b_price = price
        bench_values.append(cur_b_holdings * price)

    # ----- Metrics -----
    dd_series = drawdown_series(portfolio_values)
    md_pct, md_idx = max_drawdown(portfolio_values)

    # CAGR & total return are computed against actual cash invested via a
    # money-weighted approximation: we treat the final value vs the total
    # invested for total_return; for CAGR, we use first-trade-to-end window.
    period_start = union_dates[0]
    period_end = union_dates[-1]

    cagr_pct = cagr(invested_total, portfolio_values[-1], period_start, period_end)
    bench_cagr = cagr(bench_invested, bench_values[-1], period_start, period_end)
    vol = volatility_annualized(portfolio_values)

    out.timeseries = [
        TimeseriesPoint(
            date=d,
            value=portfolio_values[i],
            invested=invested_over_time[i],
            benchmark_value=bench_values[i],
            drawdown_pct=dd_series[i],
        )
        for i, d in enumerate(union_dates)
    ]
    out.trades = sorted_trades
    out.final_value = portfolio_values[-1]
    out.invested_total = invested_total
    out.total_return_pct = total_return(invested_total, portfolio_values[-1])
    out.cagr_pct = cagr_pct
    out.volatility_pct = vol
    out.max_drawdown_pct = md_pct
    out.max_drawdown_idx = md_idx
    out.sharpe_like = sharpe_like(cagr_pct, vol)

    out.benchmark_final_value = bench_values[-1]
    out.benchmark_total_return_pct = total_return(bench_invested, bench_values[-1])
    out.benchmark_cagr_pct = bench_cagr
    out.relative_return_pct = out.total_return_pct - out.benchmark_total_return_pct

    # Per-position contribution
    contributions: list[PositionContribution] = []
    final_per_leg: dict[str, float] = {}
    last_holdings = holdings_over_time[-1]
    last_known: dict[str, float] = {}
    for d in union_dates:
        for l in trimmed_legs:
            p = leg_maps[l.symbol].get(d)
            if p is not None:
                last_known[l.symbol] = p
    for l in trimmed_legs:
        p = last_known.get(l.symbol, 0.0)
        final_per_leg[l.symbol] = last_holdings.get(l.symbol, 0.0) * p
    total_final = sum(final_per_leg.values()) or 1.0
    for l in trimmed_legs:
        contributions.append(
            PositionContribution(
                symbol=l.symbol,
                weight_pct=l.weight_pct,
                invested=invested_per_leg.get(l.symbol, 0.0),
                final_value=final_per_leg.get(l.symbol, 0.0),
                contribution_pct=(final_per_leg.get(l.symbol, 0.0) / total_final) * 100.0,
            )
        )
    out.contributions = contributions

    # Annual returns
    p_annual = annual_returns(union_dates, portfolio_values)
    b_annual = annual_returns(union_dates, bench_values)
    out.annual = {
        y: (p_annual.get(y, 0.0), b_annual.get(y, 0.0))
        for y in sorted(set(p_annual.keys()) | set(b_annual.keys()))
    }

    return out
