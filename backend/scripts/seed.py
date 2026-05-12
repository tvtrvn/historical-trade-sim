"""Run from project root: `python scripts/seed.py [--skip-if-seeded]`."""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

# Ensure ``app`` is importable when this script is invoked directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from app.db.base import async_session_factory  # noqa: E402
from app.services.seed.seeder import (  # noqa: E402
    is_seeded,
    seed_catalog,
    seed_demo_scenarios,
    seed_prices,
)

log = logging.getLogger("seed")


async def main(skip_if_seeded: bool = False) -> None:
    configure_logging("INFO")
    settings = get_settings()
    async with async_session_factory() as db:
        # MARKETDATA_FORCE_REFRESH is the explicit "wipe synthetic prices and
        # re-pull from the real fetcher" knob. It MUST defeat --skip-if-seeded,
        # otherwise the upgrade path is unreachable on an already-populated DB
        # (the seeder's --skip-if-seeded short-circuit fires before
        # ``seed_prices`` even gets a chance to honor the flag).
        if (
            skip_if_seeded
            and not settings.marketdata_force_refresh
            and await is_seeded(db)
        ):
            log.info("Already seeded. Skipping.")
            return
        if settings.marketdata_force_refresh:
            log.warning(
                "MARKETDATA_FORCE_REFRESH=true — bypassing --skip-if-seeded "
                "and re-fetching prices from the live marketdata chain"
            )
        log.info("Seeding catalog...")
        securities = await seed_catalog(db)
        log.info("Seeding historical prices...")
        await seed_prices(db, securities)
        log.info("Seeding demo scenarios...")
        await seed_demo_scenarios(db)
        log.info("Done.")


if __name__ == "__main__":
    skip = "--skip-if-seeded" in sys.argv
    asyncio.run(main(skip_if_seeded=skip))
