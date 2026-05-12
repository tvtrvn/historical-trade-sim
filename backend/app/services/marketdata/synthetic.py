"""Synthetic GBM provider — third-tier "this app literally never fails to boot".

When both Tiingo and Stooq are unreachable (corp firewall, both services
down, dev box on a flight, …) we fall back to a deterministic Geometric
Brownian Motion path calibrated to each ticker's historical (μ, σ) and
anchored to a realistic recent close. The series is *believable* but it
is not real — chart axes look right, but a 2014-09-15 AAPL number is
indistinguishable from a different deterministic seed's 2014-09-15 AAPL
number.

This module is a thin adapter around the existing
``app.services.seed.data.generate_price_path`` so the orchestrator only
deals with the ``PriceProvider`` protocol.
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal

from app.services.marketdata.base import PricePoint
from app.services.seed.data import SECURITIES, generate_price_path

log = logging.getLogger("marketdata.synthetic")

_SPECS_BY_SYMBOL = {spec.symbol: spec for spec in SECURITIES}


class SyntheticClient:
    """Always succeeds for any ticker in our curated catalog. Returns
    ``[]`` for unknown symbols (matches the rest of the chain)."""

    name = "synthetic"

    def is_available(self) -> bool:
        return True

    async def fetch_history(
        self, symbol: str, *, start: date, end: date
    ) -> list[PricePoint]:
        spec = _SPECS_BY_SYMBOL.get(symbol.upper())
        if spec is None:
            log.info("synthetic: unknown symbol %s — no GBM calibration available", symbol)
            return []

        path = generate_price_path(spec, anchor_date=end)
        out: list[PricePoint] = []
        for d, p in path:
            if d < start or d > end:
                continue
            price = Decimal(f"{p:.4f}")
            out.append(
                PricePoint(
                    price_date=d,
                    close_price=price,
                    adj_close=price,
                    volume=None,
                )
            )
        return out


def build_synthetic() -> SyntheticClient:
    return SyntheticClient()
