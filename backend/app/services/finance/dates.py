"""Calendar helpers for the simulation engine.

We don't model trading-day calendars exactly. Instead, we forward-fill onto the
next *available* price date (capped at 7 calendar days). That handles weekends,
holidays, and short halts without pulling in a market-calendar dependency.
"""

from __future__ import annotations

from bisect import bisect_left
from datetime import date, timedelta

MAX_FORWARD_FILL_DAYS = 7


def nearest_on_or_after(price_dates: list[date], target: date) -> date | None:
    """Return the first price date >= target (within a 7-day window), else None.

    ``price_dates`` MUST be sorted ascending.
    """
    if not price_dates:
        return None
    idx = bisect_left(price_dates, target)
    if idx == len(price_dates):
        return None
    candidate = price_dates[idx]
    if (candidate - target).days <= MAX_FORWARD_FILL_DAYS:
        return candidate
    return None


def iter_recurring_dates(
    start: date, end: date, freq: str, anchor: date | None = None
) -> list[date]:
    """Generate target deposit dates for a recurring schedule.

    The first deposit is on ``anchor`` (typically the resolved start_date);
    subsequent deposits step by 1 month or 3 months. Day-of-month is clamped
    by Python's ``date`` arithmetic via simple month math.
    """
    if freq not in {"monthly", "quarterly"}:
        return []

    step_months = 1 if freq == "monthly" else 3
    out: list[date] = []
    cur = anchor or start
    out.append(cur)
    while True:
        nxt = _add_months(cur, step_months)
        if nxt > end:
            break
        out.append(nxt)
        cur = nxt
    return out


def _add_months(d: date, months: int) -> date:
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    day = min(d.day, _last_day_of_month(y, m))
    return date(y, m, day)


def _last_day_of_month(year: int, month: int) -> int:
    if month == 12:
        nxt = date(year + 1, 1, 1)
    else:
        nxt = date(year, month + 1, 1)
    return (nxt - timedelta(days=1)).day
