"""Tests for the storage-TTL cleanup job.

Covers two layers:

1. **Service**: ``cleanup_old_results`` deletes only rows whose ``run_at`` is
   strictly older than the cutoff, leaves fresh rows alone, cascades to
   ``annual_metrics``, and is idempotent.
2. **API**: ``POST /api/v1/maintenance/cleanup`` enforces the bearer-token
   contract (503 when unconfigured, 401 when wrong, 200 when right) and
   never appears in OpenAPI as a public route.

Because the cleanup endpoint reads ``get_settings()`` at call time, the API
tests below tweak the env *before* importing ``create_app`` and clear the
LRU cache, the same pattern used by ``test_security.py``.
"""

from __future__ import annotations

import os
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest

# Configure the security/maintenance env BEFORE the app is imported so the
# cached Settings see the test values.
os.environ.setdefault("ENV", "development")
os.environ["RATE_LIMIT_PER_MINUTE"] = "1000"  # don't trip rate limits during this file
os.environ["HEAVY_RATE_LIMIT_PER_MINUTE"] = "1000"
os.environ["MAINTENANCE_TOKEN"] = "test-token-do-not-use-in-prod"
os.environ["RESULT_RETENTION_DAYS"] = "30"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.db.base import async_session_factory  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import Scenario, ScenarioMode, ScenarioResult  # noqa: E402
from app.services.maintenance import cleanup_old_results  # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Service-layer tests (real async DB session)
# ─────────────────────────────────────────────────────────────────────────────


def _make_result(scenario_id: int, *, days_ago: int) -> ScenarioResult:
    return ScenarioResult(
        scenario_id=scenario_id,
        run_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
        final_value=Decimal("1000.00"),
        invested_total=Decimal("1000.00"),
        total_return_pct=Decimal("0.0000"),
        cagr_pct=Decimal("0.0000"),
        volatility_pct=Decimal("0.0000"),
        max_drawdown_pct=Decimal("0.0000"),
        sharpe_like=Decimal("0.0000"),
        benchmark_final_value=Decimal("1000.00"),
        benchmark_total_return_pct=Decimal("0.0000"),
        benchmark_cagr_pct=Decimal("0.0000"),
        relative_return_pct=Decimal("0.0000"),
        run_ms=0,
        payload={},
    )


@pytest.fixture()
async def stale_and_fresh():
    """Insert one scenario with stale + fresh + boundary results.

    Yields the row IDs; cleans up afterwards by deleting the parent scenario
    (and any results we left behind) through the ORM, which cascades via the
    relationship setting.

    Cascade-to-``annual_metrics`` is verified at the schema level
    (``ondelete="CASCADE"`` on the FK) and in production Postgres. Asserting
    it via SQLite would be misleading because SQLite doesn't enforce FK
    cascades unless ``PRAGMA foreign_keys = ON`` is set on the connection,
    and we deliberately don't toggle that here.
    """
    client_id = uuid.uuid4().hex
    async with async_session_factory() as db:
        sc = Scenario(
            client_id=client_id,
            name=f"ttl-test-{client_id[:8]}",
            mode=ScenarioMode.SINGLE,
            benchmark_symbol="SPY",
            start_date=date(2022, 1, 4),
            end_date=date(2022, 6, 1),
            initial_amount=Decimal("1000"),
        )
        db.add(sc)
        await db.flush()  # populate sc.id

        stale = _make_result(sc.id, days_ago=45)  # outside 30d
        fresh = _make_result(sc.id, days_ago=2)   # inside 30d
        boundary = _make_result(sc.id, days_ago=29)  # just inside 30d
        db.add_all([stale, fresh, boundary])
        await db.commit()

        ids = {
            "scenario": sc.id,
            "stale": stale.id,
            "fresh": fresh.id,
            "boundary": boundary.id,
        }

    yield ids

    # Clean up — drop any results we left behind, then the parent scenario.
    async with async_session_factory() as db:
        from sqlalchemy import delete as sa_delete
        await db.execute(
            sa_delete(ScenarioResult).where(
                ScenarioResult.scenario_id == ids["scenario"]
            )
        )
        sc = await db.get(Scenario, ids["scenario"])
        if sc is not None:
            await db.delete(sc)
        await db.commit()


class TestCleanupService:
    async def test_deletes_only_old_results(self, stale_and_fresh):
        ids = stale_and_fresh
        async with async_session_factory() as db:
            report = await cleanup_old_results(db, retention_days=30)

        assert report.deleted_results >= 1
        async with async_session_factory() as db:
            # The stale result is gone…
            assert await db.get(ScenarioResult, ids["stale"]) is None
            # …but the fresh + boundary results survive.
            assert await db.get(ScenarioResult, ids["fresh"]) is not None
            assert await db.get(ScenarioResult, ids["boundary"]) is not None
            # And the parent scenario itself is untouched.
            assert await db.get(Scenario, ids["scenario"]) is not None

    async def test_is_idempotent(self, stale_and_fresh):
        async with async_session_factory() as db:
            await cleanup_old_results(db, retention_days=30)
        async with async_session_factory() as db:
            second = await cleanup_old_results(db, retention_days=30)
        # Second run finds no candidates — pure no-op.
        assert second.candidates == 0
        assert second.deleted_results == 0

    async def test_short_retention_deletes_more(self, stale_and_fresh):
        """retention_days=1 should sweep the 'boundary' (29d) row too."""
        ids = stale_and_fresh
        async with async_session_factory() as db:
            report = await cleanup_old_results(db, retention_days=1)
        assert report.deleted_results >= 2
        async with async_session_factory() as db:
            # Both stale and boundary should now be gone.
            assert await db.get(ScenarioResult, ids["stale"]) is None
            assert await db.get(ScenarioResult, ids["boundary"]) is None
            # The 2-day-old "fresh" row also goes (it's older than 1 day).
            assert await db.get(ScenarioResult, ids["fresh"]) is None

    async def test_rejects_invalid_retention(self):
        async with async_session_factory() as db:
            with pytest.raises(ValueError):
                await cleanup_old_results(db, retention_days=0)


# ─────────────────────────────────────────────────────────────────────────────
# API-layer tests (auth contract on the maintenance route)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture()
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


class TestMaintenanceEndpointAuth:
    def test_no_token_returns_401(self, client):
        r = client.post("/api/v1/maintenance/cleanup")
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "UNAUTHORIZED"
        assert r.headers.get("www-authenticate", "").lower().startswith("bearer")
        # Security headers must apply to error responses too.
        assert r.headers.get("x-content-type-options") == "nosniff"

    def test_wrong_token_returns_401(self, client):
        r = client.post(
            "/api/v1/maintenance/cleanup",
            headers={"Authorization": "Bearer wrong-token"},
        )
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "UNAUTHORIZED"

    def test_wrong_scheme_returns_401(self, client):
        r = client.post(
            "/api/v1/maintenance/cleanup",
            headers={"Authorization": "Basic " + os.environ["MAINTENANCE_TOKEN"]},
        )
        assert r.status_code == 401

    def test_correct_token_returns_200(self, client):
        r = client.post(
            "/api/v1/maintenance/cleanup",
            headers={"Authorization": f"Bearer {os.environ['MAINTENANCE_TOKEN']}"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["retention_days"] == 30
        assert "cutoff" in body
        assert "deleted_results" in body
        assert "candidates" in body

    def test_endpoint_does_not_require_x_client_id(self, client):
        # System-level endpoint — must NOT require the per-user header.
        r = client.post(
            "/api/v1/maintenance/cleanup",
            headers={"Authorization": f"Bearer {os.environ['MAINTENANCE_TOKEN']}"},
        )
        assert r.status_code == 200


class TestMaintenanceEndpointDisabled:
    def test_503_when_token_unconfigured(self, monkeypatch, client):
        # Swap in a settings instance with no token.
        from app.core.config import Settings
        from app.api.v1 import maintenance as mod

        empty = Settings(
            **{
                **get_settings().model_dump(),
                "maintenance_token": "",
            }
        )
        monkeypatch.setattr(mod, "get_settings", lambda: empty)

        r = client.post(
            "/api/v1/maintenance/cleanup",
            headers={"Authorization": "Bearer anything"},
        )
        assert r.status_code == 503
        assert r.json()["error"]["code"] == "MAINTENANCE_DISABLED"
