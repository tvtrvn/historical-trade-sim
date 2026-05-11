"""Per-year portfolio vs benchmark return."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.scenario_result import ScenarioResult


class AnnualMetric(Base):
    __tablename__ = "annual_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    scenario_result_id: Mapped[int] = mapped_column(
        ForeignKey("scenario_results.id", ondelete="CASCADE"), nullable=False, index=True
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    portfolio_return_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    benchmark_return_pct: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)

    result: Mapped[ScenarioResult] = relationship(back_populates="annual_metrics")

    __table_args__ = (UniqueConstraint("scenario_result_id", "year", name="uq_annual_year"),)
