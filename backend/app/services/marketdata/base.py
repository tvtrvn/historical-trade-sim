"""Market-data providers — abstract interface + shared types.

This package exposes a single high-level entry point::

    from app.services.marketdata import fetch_history, refresh_latest

…that hides whichever provider is currently online behind a tiered fallback:

    Tiingo (real, requires API key)
        ↓ on auth/quota/network/parse failure
    Stooq  (real, no auth, CSV)
        ↓ on failure
    Synthetic GBM (always-available, deterministic)

The fallback chain is the architectural reason this project's "runs forever"
guarantee actually holds — every other layer can disappear and we still
produce a working chart.

Each provider implements the ``PriceProvider`` Protocol below. They never
talk to the DB; they only fetch and normalize. The seeder + the refresh job
own DB writes.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Protocol, runtime_checkable


@dataclass(frozen=True, slots=True)
class PricePoint:
    """Normalized daily price record across all providers.

    ``close_price`` is the raw printed close (or, when the provider only
    exposes adjusted figures, the same value as ``adj_close`` — see
    :mod:`app.services.marketdata.stooq`). ``adj_close`` is split-and-
    dividend-adjusted and is what the simulator reads for returns math.
    """

    price_date: date
    close_price: Decimal
    adj_close: Decimal
    volume: int | None


class ProviderError(Exception):
    """Base class for everything the orchestrator catches."""


class ProviderUnavailable(ProviderError):
    """Raised when a provider isn't usable in this environment (e.g. no
    API key configured). Distinct from transient errors so the orchestrator
    can log it once at startup and skip the provider silently thereafter."""


class ProviderTransientError(ProviderError):
    """Network hiccup, 429, 5xx — retryable. The orchestrator falls
    through to the next provider in the chain rather than retrying in
    place because we have a strict end-to-end time budget on container
    start."""


class ProviderDataError(ProviderError):
    """Provider responded 200 but with a shape we don't recognise (column
    rename, schema drift). Treated like a transient error — the next
    provider gets a chance — but logged at WARN because it implies a
    contract change we may need to address."""


@runtime_checkable
class PriceProvider(Protocol):
    """All providers expose this minimal surface.

    Methods are async because every concrete implementation does network
    I/O. The orchestrator imposes its own time budget so individual
    providers don't need to.
    """

    name: str  # used in logs and error messages

    def is_available(self) -> bool:  # pragma: no cover — trivial
        """Cheap configuration check (e.g. ``bool(api_key)``). Called
        once per orchestrator invocation so a missing-key Tiingo
        instance is skipped without emitting a network call."""
        ...

    async def fetch_history(
        self, symbol: str, *, start: date, end: date
    ) -> list[PricePoint]:
        """Return every daily price for ``symbol`` between ``start`` and
        ``end`` (inclusive on both ends). Returns ``[]`` if the symbol is
        not known to this provider. Raises a ``ProviderError`` subclass
        on any infrastructure-level problem."""
        ...


__all__ = [
    "PricePoint",
    "PriceProvider",
    "ProviderError",
    "ProviderUnavailable",
    "ProviderTransientError",
    "ProviderDataError",
]
