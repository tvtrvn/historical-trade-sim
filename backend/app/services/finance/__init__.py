"""Pure finance functions.

These are deliberately framework-free so they can be unit tested with plain
dictionaries / lists. The ORM/I/O glue lives in ``app.services.simulator``.
"""

from app.services.finance.engine import simulate
from app.services.finance.metrics import (
    annual_returns,
    cagr,
    max_drawdown,
    sharpe_like,
    total_return,
    volatility_annualized,
)

__all__ = [
    "annual_returns",
    "cagr",
    "max_drawdown",
    "sharpe_like",
    "simulate",
    "total_return",
    "volatility_annualized",
]
