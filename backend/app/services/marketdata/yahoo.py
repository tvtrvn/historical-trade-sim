"""Yahoo Finance chart-endpoint provider — no-auth, no-key fallback.

When we shipped this project Stooq looked like the perfect zero-config
fallback. A few months later Stooq put their CSV download behind a
captcha-acquired API key, breaking the no-auth pitch. Yahoo's
``query1.finance.yahoo.com/v8/finance/chart`` endpoint is what
``yfinance`` actually scrapes, has been publicly reachable for years,
and returns adjusted closes in a stable JSON schema.

Endpoint::

    GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
        ?period1={unix_start_seconds}
        &period2={unix_end_seconds}
        &interval=1d
        &events=div,split

Response (relevant subset)::

    {
      "chart": {
        "result": [{
          "timestamp": [1704182400, 1704268800, ...],
          "indicators": {
            "quote":     [{"close":  [185.64, 184.25, ...], "volume": [82488700, ...]}],
            "adjclose":  [{"adjclose": [183.56, 182.19, ...]}]
          }
        }],
        "error": null
      }
    }

Caveats we handle:
  * Yahoo serves a 404 (with a JSON error body) for unknown tickers — we
    surface that as ``[]`` so the orchestrator falls forward.
  * Yahoo's terms of service describe the API as "for personal use".
    Our daily-cron usage (12 tickers × 1 request) is well within that.
  * Some Yahoo CDN edges return 429 for unidentified User-Agents; we set
    a polite, identifying UA on the client.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation

import httpx

from app.services.marketdata.base import (
    PricePoint,
    ProviderDataError,
    ProviderTransientError,
)

log = logging.getLogger("marketdata.yahoo")

YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
DEFAULT_TIMEOUT_SECONDS = 15.0


class YahooClient:
    """Async client for Yahoo's chart endpoint. Stateless beyond the
    injected HTTP client."""

    name = "yahoo"

    def __init__(self, *, http: httpx.AsyncClient) -> None:
        self._http = http

    def is_available(self) -> bool:  # no config needed
        return True

    async def fetch_history(
        self, symbol: str, *, start: date, end: date
    ) -> list[PricePoint]:
        if end < start:
            raise ValueError("end < start")

        # Yahoo expects Unix seconds. Use start-of-day UTC so weekend
        # boundary dates don't accidentally drop a Monday.
        period1 = int(datetime(start.year, start.month, start.day, tzinfo=timezone.utc).timestamp())
        # period2 is exclusive — add one day so the requested end_date is
        # actually included.
        end_plus = datetime(end.year, end.month, end.day, tzinfo=timezone.utc).timestamp() + 86400
        period2 = int(end_plus)

        params = {
            "period1": period1,
            "period2": period2,
            "interval": "1d",
            "events": "div,split",
        }
        url = f"{YAHOO_BASE}/{symbol.upper()}"

        try:
            r = await self._http.get(url, params=params, timeout=DEFAULT_TIMEOUT_SECONDS)
        except httpx.RequestError as exc:
            raise ProviderTransientError(f"yahoo network error: {exc!r}") from exc

        if r.status_code == 404:
            log.info("yahoo: 404 for %s — symbol unknown", symbol)
            return []
        if r.status_code == 429:
            raise ProviderTransientError("yahoo rate-limited (429)")
        if r.status_code >= 500:
            raise ProviderTransientError(f"yahoo server error ({r.status_code})")
        if r.status_code != 200:
            raise ProviderTransientError(
                f"yahoo unexpected status {r.status_code}: {r.text[:200]}"
            )

        try:
            payload = r.json()
        except ValueError as exc:
            raise ProviderDataError(f"yahoo: non-JSON body: {exc!r}") from exc

        return _parse_payload(symbol, payload)


def _parse_payload(symbol: str, payload: dict) -> list[PricePoint]:
    """Pull (date, close, adjclose, volume) tuples out of Yahoo's nested shape."""
    chart = payload.get("chart")
    if not isinstance(chart, dict):
        raise ProviderDataError(f"yahoo[{symbol}]: payload has no 'chart'")

    # Yahoo signals "no such ticker" with both `result: null` AND a
    # populated `error` object. Treat both as "no data" rather than failure.
    err = chart.get("error")
    result_list = chart.get("result")
    if err or not result_list:
        log.info("yahoo[%s]: empty result (error=%s)", symbol, err)
        return []

    result = result_list[0]
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators") or {}

    quote_list = indicators.get("quote") or []
    adj_list = indicators.get("adjclose") or []
    if not quote_list or not adj_list:
        # Highly partial response — refuse and let the chain fall forward.
        raise ProviderDataError(f"yahoo[{symbol}]: indicators block is incomplete")

    closes = quote_list[0].get("close") or []
    volumes = quote_list[0].get("volume") or []
    adj_closes = adj_list[0].get("adjclose") or []

    # All four series should be the same length. If not, Yahoo changed
    # the schema on us — bail loudly so we notice.
    n = len(timestamps)
    if not (len(closes) == n and len(adj_closes) == n):
        raise ProviderDataError(
            f"yahoo[{symbol}]: misaligned series "
            f"(ts={n} close={len(closes)} adj={len(adj_closes)})"
        )

    points: list[PricePoint] = []
    for i in range(n):
        if closes[i] is None or adj_closes[i] is None:
            # Yahoo emits `null` for non-trading days that snuck into the
            # window (e.g. holidays). Skip them quietly.
            continue
        try:
            close = Decimal(f"{float(closes[i]):.6f}")
            adj_close = Decimal(f"{float(adj_closes[i]):.6f}")
        except (TypeError, ValueError, InvalidOperation):
            log.warning("yahoo[%s]: dropping bad numeric on idx %d", symbol, i)
            continue

        ts = timestamps[i]
        try:
            d = datetime.fromtimestamp(int(ts), tz=timezone.utc).date()
        except (TypeError, ValueError, OverflowError):
            log.warning("yahoo[%s]: dropping bad timestamp on idx %d: %r", symbol, i, ts)
            continue

        vol: int | None = None
        if i < len(volumes):
            v = volumes[i]
            if isinstance(v, (int, float)) and v > 0:
                vol = int(v)

        points.append(
            PricePoint(
                price_date=d,
                close_price=close,
                adj_close=adj_close,
                volume=vol,
            )
        )

    points.sort(key=lambda p: p.price_date)
    return points


def build_yahoo() -> YahooClient:
    """Factory used by the orchestrator. Yahoo has no configuration."""
    http = httpx.AsyncClient(
        headers={
            # Yahoo's CDN returns 429 / 401 to unidentified UAs. We
            # identify ourselves clearly so they can rate-limit us
            # specifically if they want to.
            "User-Agent": (
                "historical-trade-sim/1.0 "
                "(+contact: github.com/tvtrvn; daily-EOD only)"
            ),
            "Accept": "application/json",
        }
    )
    return YahooClient(http=http)
