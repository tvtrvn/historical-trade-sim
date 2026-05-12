"""Provider orchestrator — fan out across the tiered fallback chain.

Public surface::

    from app.services.marketdata import fetch_history

    points = await fetch_history("AAPL", start=date(2010, 1, 1), end=date.today())
    # → list[PricePoint], possibly empty

The orchestrator builds the chain once per call (cheap; no I/O), then
walks it in order: Tiingo → Yahoo → Synthetic. The first provider that
returns a non-empty list wins. If a provider raises ``ProviderUnavailable``
it is skipped silently; transient/data errors are logged at WARN and the
next provider gets a chance.

Why first-non-empty rather than first-no-exception?
  Yahoo occasionally returns a 200 with an empty result block for tickers
  whose history happens to be missing in the requested window. We don't
  want a 200-with-empty-body to fall through to the synthetic GBM and
  silently replace real data with simulation, so the orchestrator treats
  empty as a *soft* failure and falls forward. The synthetic provider is
  the guaranteed terminator — it always has rows for our curated catalog.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date

from app.core.config import get_settings
from app.services.marketdata.base import (
    PricePoint,
    PriceProvider,
    ProviderError,
    ProviderUnavailable,
)
from app.services.marketdata.synthetic import build_synthetic
from app.services.marketdata.tiingo import build_tiingo
from app.services.marketdata.yahoo import build_yahoo

log = logging.getLogger("marketdata.fetcher")


def _build_chain() -> list[PriceProvider]:
    """Construct the provider chain from current settings.

    Returns the active providers in priority order. Tiingo is omitted
    entirely when no API key is configured, so we don't pay the cost of
    a guaranteed-to-fail attempt on every call.
    """
    settings = get_settings()
    chain: list[PriceProvider] = []

    tiingo = build_tiingo(settings.tiingo_api_key)
    if tiingo is not None:
        chain.append(tiingo)
    else:
        log.info("marketdata: Tiingo disabled (no TIINGO_API_KEY); chain = yahoo → synthetic")

    chain.append(build_yahoo())
    chain.append(build_synthetic())
    return chain


async def fetch_history(
    symbol: str, *, start: date, end: date, chain: list[PriceProvider] | None = None
) -> list[PricePoint]:
    """Fetch one ticker's daily history from the best available source.

    Parameters
    ----------
    symbol:
        Uppercase ticker, e.g. ``"AAPL"``. Case is normalized inside each
        provider for its preferred convention.
    start, end:
        Inclusive bounds. The orchestrator does *not* expand the window
        to handle weekends/holidays — providers return whatever trading
        days they have within those bounds, and the simulator's
        holiday-fill logic does the rest.
    chain:
        Override the provider chain (for tests). When omitted, the
        default chain is built from settings.
    """
    if end < start:
        return []

    providers = chain if chain is not None else _build_chain()

    for provider in providers:
        try:
            if not provider.is_available():
                continue
            points = await provider.fetch_history(symbol, start=start, end=end)
        except ProviderUnavailable as exc:
            log.info("marketdata: %s skipped — %s", provider.name, exc)
            continue
        except ProviderError as exc:
            log.warning("marketdata: %s failed for %s — %s", provider.name, symbol, exc)
            continue
        except Exception as exc:  # noqa: BLE001 — last-line-of-defence
            # A bug in a provider should not topple the whole pipeline.
            log.exception(
                "marketdata: %s raised unexpected error for %s: %s",
                provider.name, symbol, exc,
            )
            continue

        if points:
            log.info(
                "marketdata: %s served %s (%d rows, %s → %s)",
                provider.name, symbol, len(points),
                points[0].price_date.isoformat(),
                points[-1].price_date.isoformat(),
            )
            return points

        log.info("marketdata: %s returned empty for %s — falling through", provider.name, symbol)

    log.error("marketdata: ALL providers failed for %s — no data returned", symbol)
    return []


async def fetch_history_batch(
    symbols: list[str], *, start: date, end: date, max_parallel: int = 4
) -> dict[str, list[PricePoint]]:
    """Fetch many tickers in parallel with a bounded fan-out.

    ``max_parallel=4`` keeps us well under both Tiingo's 50-req/hour limit
    and Stooq's "please don't hammer us" tolerance. It also limits the
    chance that one slow ticker stalls the whole seed run.
    """
    sem = asyncio.Semaphore(max_parallel)
    chain = _build_chain()

    async def _one(sym: str) -> tuple[str, list[PricePoint]]:
        async with sem:
            return sym, await fetch_history(sym, start=start, end=end, chain=chain)

    results = await asyncio.gather(*(_one(s) for s in symbols))
    return dict(results)
