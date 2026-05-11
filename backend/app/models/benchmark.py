"""Benchmark catalog. Benchmarks are securities with curated descriptions."""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Benchmark(Base, TimestampMixin):
    __tablename__ = "benchmarks"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    logo_url: Mapped[str | None] = mapped_column(String(256), nullable=True)
