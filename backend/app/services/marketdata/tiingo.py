"""Tiingo daily-EOD provider.

Why Tiingo as primary:
  * Free tier returns split + dividend-adjusted closes — the *correct*
    series for any returns-math calculation.
  * 1,000 req/day quota is ~80× our actual usage (12 tickers × 1
    daily-refresh call each).
  * Stable JSON schema since 2014.

Tiingo endpoint::

    GET https://api.tiingo.com/tiingo/daily/{ticker}/prices
        ?startDate=YYYY-MM-DD
        &endDate=YYYY-MM-DD
        &token={api_key}

We always send the token as a query parameter (Tiingo also accepts an
``Authorization: Token <key>`` header, but query-param is what's documented
in their getting-started guide and avoids one extra branch in tests).
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx

from app.services.marketdata.base import (
    PricePoint,
    ProviderDataError,
    ProviderTransientError,
    ProviderUnavailable,
)

log = logging.getLogger("marketdata.tiingo")

TIINGO_BASE = "https://api.tiingo.com"
DEFAULT_TIMEOUT_SECONDS = 15.0


class TiingoClient:
    """Thin async client for Tiingo's daily-prices endpoint.

    The HTTP client is injectable so tests can swap in ``httpx.MockTransport``.
    Real callers should use :func:`build_tiingo` which constructs a sensible
    default.
    """

    name = "tiingo"

    def __init__(self, *, api_key: str, http: httpx.AsyncClient) -> None:
        if not api_key:
            # Caller is expected to have already filtered this out via
            # ``is_available()`` — but be defensive: surfacing the missing
            # key as a clear exception is better than mailing the empty
            # token to Tiingo and getting a 401 back.
            raise ProviderUnavailable("Tiingo API key not configured")
        self._key = api_key
        self._http = http

    def is_available(self) -> bool:
        return bool(self._key)

    async def fetch_history(
        self, symbol: str, *, start: date, end: date
    ) -> list[PricePoint]:
        if end < start:
            raise ValueError("end < start")

        url = f"{TIINGO_BASE}/tiingo/daily/{symbol.lower()}/prices"
        params = {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "token": self._key,
            "format": "json",
        }

        try:
            r = await self._http.get(url, params=params, timeout=DEFAULT_TIMEOUT_SECONDS)
        except httpx.RequestError as exc:
            raise ProviderTransientError(f"tiingo network error: {exc!r}") from exc

        if r.status_code == 404:
            # Symbol is unknown to Tiingo. Not an error — surface as empty
            # so the orchestrator falls through to Stooq, which has slightly
            # different coverage.
            log.info("tiingo: 404 for %s — symbol unknown", symbol)
            return []
        if r.status_code == 401 or r.status_code == 403:
            # Invalid key — definitely won't work for this run *or* the
            # next. Treat as Unavailable so the orchestrator skips us
            # entirely until config is fixed.
            raise ProviderUnavailable(
                f"tiingo auth failed ({r.status_code}); check TIINGO_API_KEY"
            )
        if r.status_code == 429:
            raise ProviderTransientError("tiingo rate-limited (429)")
        if r.status_code >= 500:
            raise ProviderTransientError(f"tiingo server error ({r.status_code})")
        if r.status_code != 200:
            raise ProviderTransientError(
                f"tiingo unexpected status {r.status_code}: {r.text[:200]}"
            )

        try:
            rows = r.json()
        except ValueError as exc:
            raise ProviderDataError(f"tiingo: non-JSON body: {exc!r}") from exc

        if not isinstance(rows, list):
            raise ProviderDataError(f"tiingo: expected list, got {type(rows).__name__}")

        return [_parse_row(symbol, row) for row in rows]


def _parse_row(symbol: str, row: Any) -> PricePoint:
    """Translate a single Tiingo daily record into our ``PricePoint``.

    Tiingo returns ISO timestamps like ``2010-01-04T00:00:00.000Z``. We
    parse the *date* portion only — intraday is on the premium tier and
    we don't want it anyway.
    """
    if not isinstance(row, dict):
        raise ProviderDataError(f"tiingo[{symbol}]: row is not an object")

    raw_date = row.get("date")
    if not isinstance(raw_date, str):
        raise ProviderDataError(f"tiingo[{symbol}]: missing 'date'")
    try:
        parsed_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).date()
    except ValueError as exc:
        raise ProviderDataError(f"tiingo[{symbol}]: bad date {raw_date!r}") from exc

    raw_close = row.get("close")
    raw_adj_close = row.get("adjClose")
    if raw_close is None or raw_adj_close is None:
        raise ProviderDataError(f"tiingo[{symbol}]: missing close/adjClose on {raw_date}")

    try:
        close = Decimal(str(raw_close))
        adj_close = Decimal(str(raw_adj_close))
    except (InvalidOperation, TypeError) as exc:
        raise ProviderDataError(
            f"tiingo[{symbol}]: non-numeric price on {raw_date}: {raw_close!r}/{raw_adj_close!r}"
        ) from exc

    volume = row.get("volume")
    if volume is not None and not isinstance(volume, (int, float)):
        # Don't fail the whole row over a flaky volume; we just drop it.
        volume = None
    elif isinstance(volume, float):
        volume = int(volume)

    return PricePoint(
        price_date=parsed_date,
        close_price=close,
        adj_close=adj_close,
        volume=volume,
    )


def build_tiingo(api_key: str) -> TiingoClient | None:
    """Factory used by the orchestrator. Returns ``None`` if there's no
    key — this lets the orchestrator construct the chain unconditionally
    and decide at runtime whether to include Tiingo."""
    if not api_key:
        return None
    http = httpx.AsyncClient(
        headers={"User-Agent": "historical-trade-sim/1.0 (+contact: github.com/tvtrvn)"}
    )
    return TiingoClient(api_key=api_key, http=http)
