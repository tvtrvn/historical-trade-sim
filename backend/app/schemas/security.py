"""Securities & benchmarks API schemas."""

from __future__ import annotations

from app.schemas.common import APIModel


class SecurityOut(APIModel):
    id: int
    symbol: str
    name: str
    exchange: str
    asset_class: str
    logo_url: str | None = None


class BenchmarkOut(APIModel):
    id: int
    symbol: str
    name: str
    description: str
    logo_url: str | None = None
