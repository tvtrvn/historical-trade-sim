"""Pure metric functions.

Every function takes plain Python lists and returns plain Python numbers. They
are deterministic, side-effect-free, and unit tested in
``backend/tests/test_finance.py``.
"""

from __future__ import annotations

import math
from datetime import date
from decimal import Decimal


# ---------------------------------------------------------------------------
# Total return: (V_end / V_start) - 1, expressed in percent units.
# ---------------------------------------------------------------------------
def total_return(start_value: float, end_value: float) -> float:
    if start_value <= 0:
        return 0.0
    return (end_value / start_value - 1.0) * 100.0


# ---------------------------------------------------------------------------
# CAGR (Compound Annual Growth Rate).
# Years are computed as actual days / 365.25 to handle leap years.
# Returns a percent (e.g. 12.4 for 12.4% per year).
# ---------------------------------------------------------------------------
def cagr(start_value: float, end_value: float, start: date, end: date) -> float:
    if start_value <= 0 or end_value <= 0:
        return 0.0
    years = max((end - start).days / 365.25, 1e-9)
    return (math.pow(end_value / start_value, 1.0 / years) - 1.0) * 100.0


# ---------------------------------------------------------------------------
# Annualized volatility from daily log returns.
# Uses the canonical sqrt(252) scaling used across portfolio analytics.
# Returns a percent (e.g. 22.7 for 22.7%).
# ---------------------------------------------------------------------------
def volatility_annualized(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    log_returns = []
    for prev, cur in zip(values, values[1:]):
        if prev <= 0 or cur <= 0:
            continue
        log_returns.append(math.log(cur / prev))
    if len(log_returns) < 2:
        return 0.0
    mean = sum(log_returns) / len(log_returns)
    var = sum((r - mean) ** 2 for r in log_returns) / (len(log_returns) - 1)
    return math.sqrt(var) * math.sqrt(252) * 100.0


# ---------------------------------------------------------------------------
# Max drawdown.
# For each point, compute (value / running_peak - 1). Drawdown is the most
# negative such value. Returns a *positive* percent (e.g. 32.5 means -32.5%).
# Also returns the index of the trough so the UI can show a date.
# ---------------------------------------------------------------------------
def max_drawdown(values: list[float]) -> tuple[float, int]:
    if not values:
        return 0.0, 0
    peak = values[0]
    worst = 0.0
    worst_idx = 0
    for i, v in enumerate(values):
        if v > peak:
            peak = v
        if peak <= 0:
            continue
        dd = (v / peak) - 1.0
        if dd < worst:
            worst = dd
            worst_idx = i
    return abs(worst) * 100.0, worst_idx


# ---------------------------------------------------------------------------
# Drawdown series (per-point peak-to-trough percent, 0..100).
# ---------------------------------------------------------------------------
def drawdown_series(values: list[float]) -> list[float]:
    out: list[float] = []
    peak = values[0] if values else 0.0
    for v in values:
        if v > peak:
            peak = v
        out.append((v / peak - 1.0) * 100.0 if peak > 0 else 0.0)
    return out


# ---------------------------------------------------------------------------
# Sharpe-like ratio (rf = 0 in v1).
# ---------------------------------------------------------------------------
def sharpe_like(cagr_pct: float, volatility_pct: float) -> float:
    if volatility_pct <= 1e-9:
        return 0.0
    return cagr_pct / volatility_pct


# ---------------------------------------------------------------------------
# Annual returns table.
# For each calendar year fully or partially covered, compute the return from
# the first observed value of that year to the first value of the next year
# (or the final value, for the last year).
# ---------------------------------------------------------------------------
def annual_returns(dates: list[date], values: list[float]) -> dict[int, float]:
    if not dates or len(dates) != len(values):
        return {}
    out: dict[int, float] = {}
    by_year_start: dict[int, float] = {}
    for d, v in zip(dates, values):
        if d.year not in by_year_start:
            by_year_start[d.year] = v
    sorted_years = sorted(by_year_start.keys())
    for i, year in enumerate(sorted_years):
        start_v = by_year_start[year]
        end_v = (
            by_year_start[sorted_years[i + 1]] if i + 1 < len(sorted_years) else values[-1]
        )
        if start_v <= 0:
            out[year] = 0.0
        else:
            out[year] = (end_v / start_v - 1.0) * 100.0
    return out


def to_decimal(x: float, places: int = 4) -> Decimal:
    """Round a float to a fixed-precision Decimal for storage."""
    q = Decimal(10) ** -places
    return Decimal(str(x)).quantize(q)
