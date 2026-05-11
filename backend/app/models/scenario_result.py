"""Persisted simulation outcome.

The dense time series + drawdown series + trade ledger are stored as JSON in
``payload`` to avoid a million-row table for what is essentially an immutable
artifact tied to one (config, run_at) pair.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.scenario import Scenario

if TYPE_CHECKING:
    from app.models.annual_metric import AnnualMetric


class ScenarioResult(Base, TimestampMixin):
    __tablename__ = "scenario_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    scenario_id: Mapped[int] = mapped_column(
        ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    final_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    invested_total: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    total_return_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    cagr_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    volatility_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    max_drawdown_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    sharpe_like: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)

    benchmark_final_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    benchmark_total_return_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    benchmark_cagr_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    relative_return_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)

    run_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    scenario: Mapped[Scenario] = relationship(back_populates="results")
    annual_metrics: Mapped[list["AnnualMetric"]] = relationship(
        back_populates="result", cascade="all, delete-orphan", order_by="AnnualMetric.year"
    )
