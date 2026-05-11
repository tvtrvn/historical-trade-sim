"""Scenario request/response schemas."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator

from app.models.scenario import RecurringFrequency, ScenarioMode
from app.schemas.common import APIModel


# ── Hard limits / regexes ────────────────────────────────────────────────────
# Reject anything that doesn't look like a real ticker. Length capped to match
# the DB column (`String(16)`).
_SYMBOL_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,15}$")

# Strip ASCII control chars from user-controlled name. We keep the rest of
# Unicode (display only — never used to build URLs/SQL).
_CTRL_RE = re.compile(r"[\x00-\x1f\x7f]")

_MIN_START = date(2000, 1, 1)
_MAX_RANGE_DAYS = 366 * 50  # 50 years
_MAX_END_BUFFER_DAYS = 7  # tolerate a tiny clock skew vs "today"

_MAX_INITIAL_AMOUNT = Decimal("10000000000")  # 10 billion
_MAX_RECURRING_AMOUNT = Decimal("1000000000")  # 1 billion


class PositionIn(APIModel):
    symbol: str = Field(min_length=1, max_length=16)
    weight_pct: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))

    @field_validator("symbol")
    @classmethod
    def _symbol(cls, v: str) -> str:
        v = v.upper().strip()
        if not _SYMBOL_RE.match(v):
            raise ValueError("symbol must match ^[A-Z][A-Z0-9.\\-]{0,15}$")
        return v


class ScenarioIn(APIModel):
    name: str = Field(min_length=1, max_length=128)
    mode: ScenarioMode = ScenarioMode.SINGLE
    benchmark_symbol: str = Field(default="SPY", max_length=16)

    start_date: date
    end_date: date
    initial_amount: Decimal = Field(ge=Decimal("0"), le=_MAX_INITIAL_AMOUNT)

    recurring_amount: Decimal = Field(default=Decimal("0"), ge=Decimal("0"), le=_MAX_RECURRING_AMOUNT)
    recurring_freq: RecurringFrequency = RecurringFrequency.NONE
    fees_pct: Decimal = Field(default=Decimal("0"), ge=Decimal("0"), le=Decimal("5"))
    dividend_reinvest: bool = True

    positions: Annotated[list[PositionIn], Field(min_length=1, max_length=10)]

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = _CTRL_RE.sub("", v).strip()
        if not v:
            raise ValueError("name cannot be empty")
        return v

    @field_validator("benchmark_symbol")
    @classmethod
    def _bench(cls, v: str) -> str:
        v = v.upper().strip()
        if not _SYMBOL_RE.match(v):
            raise ValueError("benchmark_symbol must match ^[A-Z][A-Z0-9.\\-]{0,15}$")
        return v

    @model_validator(mode="after")
    def _check(self) -> "ScenarioIn":
        # ── Date guards ──────────────────────────────────────────────────
        today_utc = datetime.now(timezone.utc).date()
        if self.start_date < _MIN_START:
            raise ValueError(f"start_date must be on or after {_MIN_START.isoformat()}")
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        if self.end_date > today_utc + timedelta(days=_MAX_END_BUFFER_DAYS):
            raise ValueError("end_date cannot be in the future")
        if (self.end_date - self.start_date).days > _MAX_RANGE_DAYS:
            raise ValueError("date range cannot exceed 50 years")

        # ── Mode/positions ───────────────────────────────────────────────
        if self.mode == ScenarioMode.SINGLE and len(self.positions) != 1:
            raise ValueError("SINGLE mode requires exactly one position")
        if self.mode == ScenarioMode.BASKET:
            total = sum(p.weight_pct for p in self.positions)
            if abs(total - Decimal("100")) > Decimal("0.01"):
                raise ValueError(f"basket weights must sum to 100 (got {total})")
        if self.initial_amount == 0 and self.recurring_amount == 0:
            raise ValueError("at least one of initial_amount / recurring_amount must be > 0")

        # ── Duplicate symbols within a basket ────────────────────────────
        seen: set[str] = set()
        for p in self.positions:
            if p.symbol in seen:
                raise ValueError(f"duplicate position symbol: {p.symbol}")
            seen.add(p.symbol)

        return self


class TradeEvent(APIModel):
    date: date
    symbol: str
    price: Decimal
    shares: Decimal
    amount: Decimal
    kind: Literal["initial", "recurring"]


class TimeseriesPoint(APIModel):
    date: date
    value: Decimal
    invested: Decimal
    benchmark_value: Decimal
    drawdown_pct: Decimal


class AnnualMetricOut(APIModel):
    year: int
    portfolio_return_pct: Decimal
    benchmark_return_pct: Decimal


class PositionContribution(APIModel):
    symbol: str
    weight_pct: Decimal
    invested: Decimal
    final_value: Decimal
    contribution_pct: Decimal


class ScenarioResultPayload(APIModel):
    timeseries: list[TimeseriesPoint]
    trades: list[TradeEvent]
    contributions: list[PositionContribution]


class ScenarioResultOut(APIModel):
    id: int
    run_at: datetime

    final_value: Decimal
    invested_total: Decimal
    total_return_pct: Decimal
    cagr_pct: Decimal
    volatility_pct: Decimal
    max_drawdown_pct: Decimal
    sharpe_like: Decimal

    benchmark_final_value: Decimal
    benchmark_total_return_pct: Decimal
    benchmark_cagr_pct: Decimal
    relative_return_pct: Decimal

    annual_metrics: list[AnnualMetricOut]
    payload: ScenarioResultPayload
    run_ms: int


class PositionOut(APIModel):
    symbol: str
    weight_pct: Decimal


class ScenarioOut(APIModel):
    id: int
    name: str
    mode: ScenarioMode
    benchmark_symbol: str
    start_date: date
    end_date: date
    initial_amount: Decimal
    recurring_amount: Decimal
    recurring_freq: RecurringFrequency
    fees_pct: Decimal
    dividend_reinvest: bool
    created_at: datetime
    positions: list[PositionOut]
    latest_result: ScenarioResultOut | None = None


class ScenarioListItem(APIModel):
    id: int
    name: str
    mode: ScenarioMode
    benchmark_symbol: str
    start_date: date
    end_date: date
    created_at: datetime
    positions: list[PositionOut]
    latest_summary: dict | None = None  # quick metrics for the card grid


class CompareIn(APIModel):
    scenario_a_id: int = Field(ge=1)
    scenario_b_id: int = Field(ge=1)


class CompareOut(APIModel):
    scenario_a: ScenarioOut
    scenario_b: ScenarioOut
