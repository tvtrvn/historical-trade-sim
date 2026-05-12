"""Manually pull the latest closes from the marketdata fetcher.

Usage::

    python scripts/refresh_prices.py            # daily incremental refresh
    python scripts/refresh_prices.py --json     # machine-readable output

The HTTP-based variant lives at ``POST /api/v1/maintenance/refresh-prices``
and is what the GitHub Actions cron actually calls. This script is for
local-dev runs and ad-hoc operator debugging.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.logging import configure_logging  # noqa: E402
from app.db.base import async_session_factory  # noqa: E402
from app.services.marketdata.refresh import refresh_all  # noqa: E402


async def main(as_json: bool) -> int:
    configure_logging("INFO")
    async with async_session_factory() as db:
        report = await refresh_all(db)

    if as_json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        d = report.to_dict()
        print(
            f"refresh: processed={d['symbols_processed']} "
            f"with_new_data={d['symbols_with_new_data']} "
            f"rows_inserted={d['rows_inserted']} "
            f"duration_ms={d['duration_ms']}"
        )
        if d["errors"]:
            print("errors:")
            for e in d["errors"]:
                print(f"  - {e}")

    return 0 if not report.errors else 2


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of human text.")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(as_json=args.json)))
