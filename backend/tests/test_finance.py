"""Pure unit tests for the finance engine.

Run with: ``pytest -q`` from ``backend/``.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.db.base import _build_async_engine_args
from app.services.finance.dates import iter_recurring_dates, nearest_on_or_after
from app.services.finance.engine import Leg, SimulationInput, simulate
from app.services.finance.metrics import (
    annual_returns,
    cagr,
    drawdown_series,
    max_drawdown,
    sharpe_like,
    total_return,
    volatility_annualized,
)


# ─────────────────────────────────────────────────────────────────────────────
# DB URL translation — Neon-style URLs must work without manual editing
# ─────────────────────────────────────────────────────────────────────────────


def test_async_engine_args_strips_sslmode_and_sets_ssl_true():
    url = (
        "postgresql+asyncpg://u:p@ep-x.aws.neon.tech/db"
        "?sslmode=require&channel_binding=require"
    )
    cleaned, args = _build_async_engine_args(url)
    assert "sslmode=" not in cleaned
    assert "channel_binding=" not in cleaned
    assert args == {"ssl": True}


def test_async_engine_args_leaves_non_asyncpg_urls_alone():
    url = "sqlite+aiosqlite:///./local.db"
    cleaned, args = _build_async_engine_args(url)
    assert cleaned == url
    assert args == {}


def test_async_engine_args_no_ssl_when_sslmode_disable():
    url = "postgresql+asyncpg://u:p@host/db?sslmode=disable"
    cleaned, args = _build_async_engine_args(url)
    assert "sslmode=" not in cleaned
    assert args == {}  # disabled: don't request TLS


def test_async_engine_args_preserves_other_query_params():
    url = "postgresql+asyncpg://u:p@h/db?application_name=hts&sslmode=require"
    cleaned, args = _build_async_engine_args(url)
    assert "application_name=hts" in cleaned
    assert "sslmode" not in cleaned
    assert args == {"ssl": True}


def _line_series(start: date, end: date, start_price: float, daily_growth: float):
    out = []
    d = start
    p = start_price
    while d <= end:
        if d.weekday() < 5:
            out.append((d, p))
            p *= 1.0 + daily_growth
        d += timedelta(days=1)
    return out


def test_total_return_basic():
    assert total_return(100, 200) == pytest.approx(100.0)
    assert total_return(100, 50) == pytest.approx(-50.0)
    assert total_return(0, 100) == 0.0


def test_cagr_doubles_in_one_year():
    s, e = date(2020, 1, 1), date(2021, 1, 1)
    assert cagr(100, 200, s, e) == pytest.approx(100.0, abs=0.5)


def test_volatility_zero_for_constant_series():
    assert volatility_annualized([100.0] * 252) == 0.0


def test_max_drawdown_simple():
    values = [100, 110, 105, 90, 120, 95]
    md, idx = max_drawdown(values)
    # peak 120 at idx 4; trough 95 at idx 5 → -20.83%
    assert md == pytest.approx((1 - 95 / 120) * 100, rel=1e-3)
    assert idx == 5


def test_drawdown_series_starts_zero_then_negative():
    series = drawdown_series([100, 110, 99])
    assert series[0] == 0.0
    assert series[1] == 0.0
    assert series[2] == pytest.approx((99 / 110 - 1) * 100, rel=1e-3)


def test_sharpe_like_zero_vol():
    assert sharpe_like(10.0, 0.0) == 0.0
    assert sharpe_like(10.0, 5.0) == pytest.approx(2.0)


def test_annual_returns_two_years():
    dates = [date(2020, 1, 5), date(2020, 6, 1), date(2021, 1, 5), date(2021, 12, 31)]
    values = [100, 110, 110, 132]
    out = annual_returns(dates, values)
    # 2020: 100 -> first val of 2021 = 110 -> +10%
    # 2021: 110 -> 132 -> +20%
    assert out[2020] == pytest.approx(10.0, abs=0.01)
    assert out[2021] == pytest.approx(20.0, abs=0.01)


def test_nearest_on_or_after_within_window():
    pds = [date(2024, 1, 8), date(2024, 1, 9)]
    assert nearest_on_or_after(pds, date(2024, 1, 6)) == date(2024, 1, 8)
    assert nearest_on_or_after(pds, date(2024, 1, 9)) == date(2024, 1, 9)
    assert nearest_on_or_after(pds, date(2024, 1, 10)) is None  # past last


def test_nearest_on_or_after_window_caps_at_7_days():
    pds = [date(2024, 1, 30)]
    assert nearest_on_or_after(pds, date(2024, 1, 23)) == date(2024, 1, 30)
    assert nearest_on_or_after(pds, date(2024, 1, 22)) is None


def test_iter_recurring_monthly_caps_inside_window():
    out = iter_recurring_dates(date(2020, 1, 15), date(2020, 4, 16), "monthly")
    # expect 4 dates: Jan 15, Feb 15, Mar 15, Apr 15
    assert len(out) == 4
    assert out[0] == date(2020, 1, 15)
    assert out[-1] == date(2020, 4, 15)


def test_simulate_lump_sum_growth():
    """Lump-sum buy + perfectly linear growth → end value matches expectation."""
    start, end = date(2020, 1, 1), date(2021, 1, 1)
    series = _line_series(start, end, 100.0, 0.0010)  # ~+28.7%/year
    leg = Leg(symbol="ABC", weight_pct=100.0, prices=series)
    bench = Leg(symbol="SPY", weight_pct=100.0, prices=_line_series(start, end, 100.0, 0.0005))
    inp = SimulationInput(
        legs=[leg],
        benchmark=bench,
        start_date=start,
        end_date=end,
        initial_amount=10_000.0,
    )
    out = simulate(inp)
    # invested $10k, final value > invested
    assert out.invested_total == pytest.approx(10_000.0, abs=1e-6)
    assert out.final_value > 10_000.0
    # vs benchmark (slower growth) should be positive
    assert out.relative_return_pct > 0


def test_simulate_dca_invests_more_over_time():
    start, end = date(2020, 1, 1), date(2020, 12, 31)
    series = _line_series(start, end, 100.0, 0.0)  # flat prices → no return
    leg = Leg(symbol="ABC", weight_pct=100.0, prices=series)
    bench = Leg(symbol="SPY", weight_pct=100.0, prices=series)
    inp = SimulationInput(
        legs=[leg],
        benchmark=bench,
        start_date=start,
        end_date=end,
        initial_amount=0.0,
        recurring_amount=100.0,
        recurring_freq="monthly",
    )
    out = simulate(inp)
    # 12 deposits of $100 → invested ~$1200, final value ~= invested (flat prices)
    assert out.invested_total == pytest.approx(1200.0, abs=0.01)
    assert out.final_value == pytest.approx(out.invested_total, rel=1e-4)


def test_simulate_basket_weights_normalize():
    start, end = date(2020, 1, 1), date(2021, 1, 1)
    s_a = _line_series(start, end, 100.0, 0.0010)
    s_b = _line_series(start, end, 50.0, 0.0005)
    legs = [Leg("A", 50.0, s_a), Leg("B", 50.0, s_b)]
    bench = Leg("SPY", 100.0, s_a)
    out = simulate(
        SimulationInput(
            legs=legs,
            benchmark=bench,
            start_date=start,
            end_date=end,
            initial_amount=10_000.0,
        )
    )
    contrib_total = sum(c.invested for c in out.contributions)
    assert contrib_total == pytest.approx(10_000.0, abs=0.01)
    # Each leg got ~$5000
    for c in out.contributions:
        assert c.invested == pytest.approx(5_000.0, rel=1e-3)


def test_simulate_holiday_forward_fill():
    """If start_date falls on a Saturday we still resolve to next Monday."""
    start = date(2020, 1, 4)  # Saturday
    end = date(2021, 1, 1)
    # Generate trading-day series starting Jan 6 (Monday)
    series = _line_series(date(2020, 1, 1), end, 100.0, 0.0005)
    leg = Leg("ABC", 100.0, series)
    bench = Leg("SPY", 100.0, series)
    out = simulate(
        SimulationInput(
            legs=[leg],
            benchmark=bench,
            start_date=start,
            end_date=end,
            initial_amount=1000.0,
        )
    )
    assert out.invested_total == pytest.approx(1000.0, abs=1e-6)
    assert out.trades, "expected at least one trade"
    # First trade resolved to a weekday (Mon Jan 6)
    assert out.trades[0].date.weekday() < 5
