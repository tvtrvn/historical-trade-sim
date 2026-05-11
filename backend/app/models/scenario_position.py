"""One leg of a basket scenario (or the single position for SINGLE mode)."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.scenario import Scenario


class ScenarioPosition(Base):
    __tablename__ = "scenario_positions"

    id: Mapped[int] = mapped_column(primary_key=True)
    scenario_id: Mapped[int] = mapped_column(
        ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    symbol: Mapped[str] = mapped_column(String(16), nullable=False)
    weight_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)

    scenario: Mapped[Scenario] = relationship(back_populates="positions")
