"""Scenario = the user's saved configuration of a what-if simulation."""

from __future__ import annotations

import enum
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Enum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.scenario_position import ScenarioPosition
    from app.models.scenario_result import ScenarioResult


class ScenarioMode(str, enum.Enum):
    SINGLE = "single"
    BASKET = "basket"


class RecurringFrequency(str, enum.Enum):
    NONE = "none"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


class Scenario(Base, TimestampMixin):
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    mode: Mapped[ScenarioMode] = mapped_column(
        Enum(ScenarioMode, name="scenario_mode"), nullable=False, default=ScenarioMode.SINGLE
    )
    benchmark_symbol: Mapped[str] = mapped_column(String(16), nullable=False, default="SPY")

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    initial_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    recurring_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0")
    )
    recurring_freq: Mapped[RecurringFrequency] = mapped_column(
        Enum(RecurringFrequency, name="recurring_frequency"),
        nullable=False,
        default=RecurringFrequency.NONE,
    )
    fees_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False, default=Decimal("0"))
    dividend_reinvest: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    positions: Mapped[list["ScenarioPosition"]] = relationship(
        back_populates="scenario", cascade="all, delete-orphan"
    )
    results: Mapped[list["ScenarioResult"]] = relationship(
        back_populates="scenario", cascade="all, delete-orphan", order_by="ScenarioResult.run_at.desc()"
    )
