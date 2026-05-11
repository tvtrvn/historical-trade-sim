"""Securities catalog (stocks + ETFs)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.historical_price import HistoricalPrice


class Security(Base, TimestampMixin):
    __tablename__ = "securities"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    exchange: Mapped[str] = mapped_column(String(16), nullable=False, default="NASDAQ")
    asset_class: Mapped[str] = mapped_column(String(16), nullable=False, default="equity")
    logo_url: Mapped[str | None] = mapped_column(String(256), nullable=True)

    prices: Mapped[list["HistoricalPrice"]] = relationship(
        back_populates="security", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_securities_symbol_lower", "symbol"),)
