"""Seed catalog and synthetic but realistic price generator.

We do not pull from a real data provider in the demo. Instead we generate a
deterministic geometric Brownian motion per ticker, calibrated to historical
drift/volatility, anchored to a known recent close so the chart axes look
plausible. This keeps the demo offline-friendly while still producing
believable AAPL-since-2011 narratives.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class TickerSpec:
    symbol: str
    name: str
    exchange: str
    asset_class: str
    logo_url: str
    # Calibration: annual drift (mu) and annual volatility (sigma) as decimals.
    mu: float
    sigma: float
    # Anchor: a known close near 2026-04-29 to back-solve the path.
    anchor_price: float


# Calibration values chosen to produce visually-plausible "post-2010" stories.
# (e.g. AAPL ~+25%/y CAGR with 30%-ish vol, SPY ~+11%/y with 16% vol).
SECURITIES: list[TickerSpec] = [
    TickerSpec("AAPL", "Apple Inc.", "NASDAQ", "equity",
               "https://logo.clearbit.com/apple.com", 0.24, 0.28, 215.0),
    TickerSpec("MSFT", "Microsoft Corporation", "NASDAQ", "equity",
               "https://logo.clearbit.com/microsoft.com", 0.22, 0.25, 430.0),
    TickerSpec("NVDA", "NVIDIA Corporation", "NASDAQ", "equity",
               "https://logo.clearbit.com/nvidia.com", 0.36, 0.46, 920.0),
    TickerSpec("GOOGL", "Alphabet Inc. Class A", "NASDAQ", "equity",
               "https://logo.clearbit.com/abc.xyz", 0.18, 0.27, 175.0),
    TickerSpec("AMZN", "Amazon.com, Inc.", "NASDAQ", "equity",
               "https://logo.clearbit.com/amazon.com", 0.22, 0.32, 195.0),
    TickerSpec("META", "Meta Platforms, Inc.", "NASDAQ", "equity",
               "https://logo.clearbit.com/meta.com", 0.20, 0.34, 510.0),
    TickerSpec("TSLA", "Tesla, Inc.", "NASDAQ", "equity",
               "https://logo.clearbit.com/tesla.com", 0.26, 0.55, 250.0),
    TickerSpec("SPY", "SPDR S&P 500 ETF Trust", "NYSEARCA", "etf",
               "https://logo.clearbit.com/ssga.com", 0.11, 0.16, 530.0),
    TickerSpec("QQQ", "Invesco QQQ Trust", "NASDAQ", "etf",
               "https://logo.clearbit.com/invesco.com", 0.14, 0.20, 470.0),
    TickerSpec("VTI", "Vanguard Total Stock Market ETF", "NYSEARCA", "etf",
               "https://logo.clearbit.com/vanguard.com", 0.11, 0.16, 270.0),
    TickerSpec("DIA", "SPDR Dow Jones Industrial Average ETF", "NYSEARCA", "etf",
               "https://logo.clearbit.com/ssga.com", 0.10, 0.15, 400.0),
    TickerSpec("IWM", "iShares Russell 2000 ETF", "NYSEARCA", "etf",
               "https://logo.clearbit.com/ishares.com", 0.09, 0.22, 215.0),
]


BENCHMARKS: list[tuple[str, str, str]] = [
    ("SPY", "S&P 500", "Tracks the S&P 500 index — the standard US equities benchmark."),
    ("QQQ", "Nasdaq 100", "Tracks the Nasdaq-100 — large-cap, tech-heavy."),
    ("VTI", "Total US Market", "Broad US equity exposure across small-, mid-, and large-cap."),
    ("DIA", "Dow Jones 30", "Tracks the Dow Jones Industrial Average — 30 large US companies."),
    ("IWM", "Russell 2000", "Small-cap US equities benchmark."),
]


SEED_START = date(2010, 1, 1)
SEED_END = date(2026, 4, 29)


def _trading_days(start: date, end: date) -> list[date]:
    """Approximate trading days: skip weekends only."""
    out: list[date] = []
    d = start
    while d <= end:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


def generate_price_path(spec: TickerSpec, anchor_date: date = SEED_END) -> list[tuple[date, float]]:
    """Generate a deterministic GBM path that *ends* at the anchor price.

    We:
      1) Forward-simulate a normalized GBM path of length N from value 1.0.
      2) Scale the entire path so the last value equals ``anchor_price``.

    The seed is derived from the symbol so re-runs are bit-identical.
    """
    days = _trading_days(SEED_START, anchor_date)
    n = len(days)
    rng = random.Random(hash(spec.symbol) & 0xFFFFFFFF)

    dt = 1.0 / 252.0
    drift = (spec.mu - 0.5 * spec.sigma * spec.sigma) * dt
    vol = spec.sigma * math.sqrt(dt)

    raw = [1.0]
    for _ in range(n - 1):
        z = rng.gauss(0.0, 1.0)
        raw.append(raw[-1] * math.exp(drift + vol * z))

    scale = spec.anchor_price / raw[-1]
    return [(d, raw[i] * scale) for i, d in enumerate(days)]
