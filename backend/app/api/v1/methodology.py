"""Static methodology JSON used to render the /methodology page."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/methodology", tags=["methodology"])


METHODOLOGY = {
    "intro": (
        "Every metric in this product is computed from real historical adjusted-close prices. "
        "We forward-fill weekends and holidays onto the next valid trading day, capped at "
        "seven calendar days, so picking a Saturday never breaks a simulation."
    ),
    "sections": [
        {
            "id": "total-return",
            "title": "Total return",
            "summary": "(V_end / V_start) − 1, expressed in percent.",
            "details": (
                "We compare the final portfolio value against the dollars actually invested. "
                "For DCA simulations this is sometimes called money-weighted return."
            ),
        },
        {
            "id": "cagr",
            "title": "CAGR (compound annual growth rate)",
            "summary": "((V_end / V_start) ^ (1 / years)) − 1.",
            "details": (
                "We use actual_days / 365.25 as the denominator to handle leap years. "
                "CAGR is the constant annual rate that compounds your initial investment "
                "into the final value."
            ),
        },
        {
            "id": "volatility",
            "title": "Volatility",
            "summary": "Standard deviation of daily log returns × √252.",
            "details": (
                "We annualize the daily log-return standard deviation by multiplying by √252 "
                "(the conventional number of trading days per year)."
            ),
        },
        {
            "id": "drawdown",
            "title": "Max drawdown",
            "summary": "Largest peak-to-trough decline of the portfolio.",
            "details": (
                "For each day t we compute (value_t / running_peak_t) − 1. The most negative "
                "number is the max drawdown. We also surface the trough date so the dashboard "
                "can put a label on it."
            ),
        },
        {
            "id": "benchmark",
            "title": "Benchmark comparison",
            "summary": "Same engine, same deposit schedule, against SPY by default.",
            "details": (
                "We re-run the simulation against the chosen benchmark with the same deposit "
                "schedule, so the comparison is fair. Outperformance is the difference in "
                "total return in percentage points."
            ),
        },
        {
            "id": "recurring",
            "title": "Recurring contributions",
            "summary": "Monthly or quarterly deposits, executed on the next valid trading day.",
            "details": (
                "Each deposit is allocated pro-rata across basket weights. Fees are deducted "
                "from each buy as a flat percent."
            ),
        },
    ],
    "disclaimer": "Educational only. Not investment advice.",
}


@router.get("", summary="Return the methodology document used to render /methodology")
async def get_methodology() -> dict:
    return METHODOLOGY
