"""Tests for the market-data subsystem.

Three layers covered:

1. **Tiingo client** — parses JSON, handles 404/401/429/5xx correctly.
2. **Stooq client** — parses CSV, tolerates schema drift, drops malformed rows.
3. **Fetcher orchestrator** — walks the chain, falls forward on errors and
   empty responses, never raises through to the caller.

We use ``httpx.MockTransport`` so the suite is fully offline and
deterministic. The synthetic fallback uses our existing GBM generator
and a real ``SECURITIES`` entry — no mock needed.
"""

from __future__ import annotations

import os
from datetime import date

import httpx
import pytest

os.environ.setdefault("ENV", "development")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.services.marketdata import fetch_history  # noqa: E402
from app.services.marketdata.base import (  # noqa: E402
    ProviderDataError,
    ProviderTransientError,
    ProviderUnavailable,
)
from app.services.marketdata.synthetic import SyntheticClient  # noqa: E402
from app.services.marketdata.tiingo import TiingoClient  # noqa: E402
from app.services.marketdata.yahoo import YahooClient, _parse_payload  # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Tiingo client
# ─────────────────────────────────────────────────────────────────────────────


def _tiingo_with(handler) -> TiingoClient:
    """Build a TiingoClient backed by an in-process MockTransport."""
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport)
    return TiingoClient(api_key="test-key", http=http)


class TestTiingo:
    async def test_parses_happy_path(self):
        def handler(req):
            assert "tiingo/daily/aapl/prices" in req.url.path
            assert req.url.params.get("token") == "test-key"
            return httpx.Response(
                200,
                json=[
                    {
                        "date": "2024-01-02T00:00:00.000Z",
                        "close": 185.64,
                        "adjClose": 185.10,
                        "volume": 82488700,
                    },
                    {
                        "date": "2024-01-03T00:00:00.000Z",
                        "close": 184.25,
                        "adjClose": 183.71,
                        "volume": 58414500,
                    },
                ],
            )

        client = _tiingo_with(handler)
        points = await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))

        from decimal import Decimal

        assert [p.price_date for p in points] == [date(2024, 1, 2), date(2024, 1, 3)]
        # adjClose must be the source of truth for adj_close (used by simulator)
        assert points[0].adj_close == Decimal("185.10")
        assert points[1].close_price == Decimal("184.25")
        assert points[0].volume == 82488700

    async def test_404_returns_empty(self):
        client = _tiingo_with(lambda req: httpx.Response(404, json={"detail": "not found"}))
        points = await client.fetch_history("NOPE", start=date(2024, 1, 1), end=date(2024, 1, 5))
        assert points == []

    async def test_401_raises_unavailable(self):
        client = _tiingo_with(lambda req: httpx.Response(401, json={"detail": "bad token"}))
        with pytest.raises(ProviderUnavailable):
            await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))

    async def test_429_raises_transient(self):
        client = _tiingo_with(lambda req: httpx.Response(429, text="slow down"))
        with pytest.raises(ProviderTransientError):
            await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))

    async def test_5xx_raises_transient(self):
        client = _tiingo_with(lambda req: httpx.Response(503, text="under maintenance"))
        with pytest.raises(ProviderTransientError):
            await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))

    async def test_bad_json_raises_data_error(self):
        client = _tiingo_with(lambda req: httpx.Response(200, text="not json {{{"))
        with pytest.raises(ProviderDataError):
            await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))

    async def test_missing_fields_raises_data_error(self):
        client = _tiingo_with(
            lambda req: httpx.Response(
                200,
                json=[{"date": "2024-01-02T00:00:00.000Z"}],  # missing close/adjClose
            )
        )
        with pytest.raises(ProviderDataError):
            await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))


# ─────────────────────────────────────────────────────────────────────────────
# Yahoo Finance client
# ─────────────────────────────────────────────────────────────────────────────


def _yahoo_with(handler) -> YahooClient:
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport)
    return YahooClient(http=http)


def _yahoo_payload(rows: list[tuple[int, float | None, float | None, int | None]]) -> dict:
    """Build a synthetic Yahoo chart payload from (unix_ts, close, adj, vol) rows."""
    return {
        "chart": {
            "result": [
                {
                    "timestamp": [r[0] for r in rows],
                    "indicators": {
                        "quote": [
                            {
                                "close": [r[1] for r in rows],
                                "volume": [r[3] for r in rows],
                            }
                        ],
                        "adjclose": [{"adjclose": [r[2] for r in rows]}],
                    },
                }
            ],
            "error": None,
        }
    }


class TestYahoo:
    async def test_parses_happy_path(self):
        from decimal import Decimal

        # 2024-01-02 00:00 UTC and 2024-01-03 00:00 UTC.
        payload = _yahoo_payload(
            [
                (1704153600, 185.64, 183.5622, 82488700),
                (1704240000, 184.25, 182.1877, 58414500),
            ]
        )

        def handler(req):
            assert "query1.finance.yahoo.com" in req.url.host
            assert "/v8/finance/chart/AAPL" in req.url.path
            return httpx.Response(200, json=payload)

        client = _yahoo_with(handler)
        points = await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))

        assert [p.price_date for p in points] == [date(2024, 1, 2), date(2024, 1, 3)]
        # adj_close must be the source of truth for returns math
        assert points[0].adj_close == Decimal("183.562200")
        assert points[1].close_price == Decimal("184.250000")
        assert points[1].volume == 58414500

    async def test_404_returns_empty(self):
        client = _yahoo_with(lambda req: httpx.Response(404, json={"error": "not found"}))
        points = await client.fetch_history("NOPE", start=date(2024, 1, 1), end=date(2024, 1, 5))
        assert points == []

    async def test_error_block_returns_empty(self):
        """Yahoo also signals 'unknown symbol' as 200 with `error` populated."""
        payload = {"chart": {"result": None, "error": {"code": "Not Found"}}}
        client = _yahoo_with(lambda req: httpx.Response(200, json=payload))
        points = await client.fetch_history("NOPE", start=date(2024, 1, 1), end=date(2024, 1, 5))
        assert points == []

    async def test_429_raises_transient(self):
        client = _yahoo_with(lambda req: httpx.Response(429, text="slow down"))
        with pytest.raises(ProviderTransientError):
            await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))

    async def test_null_rows_are_skipped(self):
        """Yahoo emits null for holidays that snuck into the window. Skip them."""
        payload = _yahoo_payload(
            [
                (1704153600, 185.64, 183.5622, 82488700),
                (1704240000, None, None, None),  # holiday
                (1704326400, 181.91, 179.8739, 71983600),
            ]
        )
        client = _yahoo_with(lambda req: httpx.Response(200, json=payload))
        points = await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5))
        assert len(points) == 2  # the holiday row is dropped

    async def test_misaligned_series_raises_data_error(self):
        payload = {
            "chart": {
                "result": [
                    {
                        "timestamp": [1704153600, 1704240000],
                        "indicators": {
                            "quote": [{"close": [185.64], "volume": [82488700]}],
                            "adjclose": [{"adjclose": [183.56, 182.19]}],
                        },
                    }
                ],
                "error": None,
            }
        }
        with pytest.raises(ProviderDataError):
            _parse_payload("AAPL", payload)


# ─────────────────────────────────────────────────────────────────────────────
# Synthetic fallback
# ─────────────────────────────────────────────────────────────────────────────


class TestSynthetic:
    async def test_returns_data_for_curated_ticker(self):
        client = SyntheticClient()
        points = await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 31))
        assert len(points) > 15  # ~21 trading days in January
        # The GBM is deterministic — same symbol must give same first close.
        first_again = (
            await client.fetch_history("AAPL", start=date(2024, 1, 1), end=date(2024, 1, 31))
        )[0]
        assert first_again.adj_close == points[0].adj_close

    async def test_unknown_symbol_returns_empty(self):
        client = SyntheticClient()
        points = await client.fetch_history(
            "NOTREAL", start=date(2024, 1, 1), end=date(2024, 1, 31)
        )
        assert points == []


# ─────────────────────────────────────────────────────────────────────────────
# Fetcher orchestrator — the *contract* tests
# ─────────────────────────────────────────────────────────────────────────────


class _StubProvider:
    """Tiny synchronous test double that conforms to the PriceProvider Protocol."""

    def __init__(self, name: str, *, available: bool = True, points=None, raise_=None):
        self.name = name
        self._available = available
        self._points = points or []
        self._raise = raise_
        self.calls = 0

    def is_available(self) -> bool:
        return self._available

    async def fetch_history(self, symbol, *, start, end):
        self.calls += 1
        if self._raise is not None:
            raise self._raise
        return list(self._points)


def _point(d: str, v: float = 100.0):
    from decimal import Decimal

    from app.services.marketdata.base import PricePoint

    return PricePoint(date.fromisoformat(d), Decimal(str(v)), Decimal(str(v)), None)


class TestFetcher:
    async def test_first_available_wins(self):
        primary = _StubProvider("primary", points=[_point("2024-01-02")])
        secondary = _StubProvider("secondary", points=[_point("1999-01-04")])
        result = await fetch_history(
            "AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5),
            chain=[primary, secondary],
        )
        assert len(result) == 1
        assert result[0].price_date == date(2024, 1, 2)
        # We must NOT have asked the secondary at all.
        assert secondary.calls == 0

    async def test_falls_forward_on_transient_error(self):
        primary = _StubProvider(
            "primary", raise_=ProviderTransientError("flaky"),
        )
        secondary = _StubProvider("secondary", points=[_point("2024-01-02")])
        result = await fetch_history(
            "AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5),
            chain=[primary, secondary],
        )
        assert primary.calls == 1
        assert secondary.calls == 1
        assert len(result) == 1

    async def test_falls_forward_on_unavailable(self):
        primary = _StubProvider("primary", available=False)
        secondary = _StubProvider("secondary", points=[_point("2024-01-02")])
        result = await fetch_history(
            "AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5),
            chain=[primary, secondary],
        )
        # is_available is consulted; fetch_history should NOT be called.
        assert primary.calls == 0
        assert len(result) == 1

    async def test_falls_forward_on_empty_response(self):
        """200-with-empty-body shouldn't keep real data from a later provider."""
        primary = _StubProvider("primary", points=[])  # 200 OK but nothing
        secondary = _StubProvider("secondary", points=[_point("2024-01-02")])
        result = await fetch_history(
            "AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5),
            chain=[primary, secondary],
        )
        assert len(result) == 1

    async def test_returns_empty_when_every_provider_fails(self):
        primary = _StubProvider("primary", raise_=ProviderTransientError("down"))
        secondary = _StubProvider("secondary", raise_=ProviderTransientError("also down"))
        result = await fetch_history(
            "AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5),
            chain=[primary, secondary],
        )
        assert result == []

    async def test_swallows_bug_in_provider(self):
        """A buggy provider raising a generic Exception must not crash the chain."""
        primary = _StubProvider("primary", raise_=RuntimeError("oops"))
        secondary = _StubProvider("secondary", points=[_point("2024-01-02")])
        result = await fetch_history(
            "AAPL", start=date(2024, 1, 1), end=date(2024, 1, 5),
            chain=[primary, secondary],
        )
        assert len(result) == 1

    async def test_invalid_window_returns_empty_without_calls(self):
        primary = _StubProvider("primary", points=[_point("2024-01-02")])
        result = await fetch_history(
            "AAPL", start=date(2024, 1, 5), end=date(2024, 1, 1),
            chain=[primary],
        )
        assert result == []
        assert primary.calls == 0
