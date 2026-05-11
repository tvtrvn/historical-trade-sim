"""End-to-end security & abuse-protection tests.

These tests exercise the live FastAPI app via TestClient. They cover the
parts of the security surface that are independent of the seeded historical
prices: input validation, body-size cap, rate limiting, security headers,
and the error envelope shape.

DB-dependent guards (IDOR, per-client scenario cap) are also covered via
the simulator service unit tests where applicable, and via the e2e API
contract — both endpoints filter on ``client_id`` in the WHERE clause and
the ``LimitExceededError`` path is triggered via a unit test on
``save_scenario`` itself.
"""

from __future__ import annotations

import os
import uuid

import pytest

# Tighten the limits BEFORE importing the app so the cached Settings see them.
os.environ.setdefault("ENV", "development")
os.environ["RATE_LIMIT_PER_MINUTE"] = "60"
os.environ["HEAVY_RATE_LIMIT_PER_MINUTE"] = "3"
os.environ["MAX_BODY_BYTES"] = "2048"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.main import create_app  # noqa: E402


def _new_client_id() -> str:
    return uuid.uuid4().hex


def _ok_simulate_payload() -> dict:
    return {
        "name": "Some scenario",
        "mode": "single",
        "benchmark_symbol": "SPY",
        "start_date": "2022-01-04",
        "end_date": "2022-09-01",
        "initial_amount": "1000",
        "recurring_amount": "0",
        "recurring_freq": "none",
        "fees_pct": "0",
        "dividend_reinvest": True,
        "positions": [{"symbol": "AAPL", "weight_pct": "100"}],
    }


@pytest.fixture()
def client():
    """Fresh app per test → fresh in-memory rate-limit bucket."""
    app = create_app()
    with TestClient(app) as c:
        yield c


# ─────────────────────────────────────────────────────────────────────────────
# 1. X-Client-Id format validation
# ─────────────────────────────────────────────────────────────────────────────


class TestClientIdValidation:
    def test_missing_header_rejected(self, client):
        r = client.get("/api/v1/scenarios")
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "INVALID_INPUT"

    def test_short_garbage_rejected(self, client):
        r = client.get("/api/v1/scenarios", headers={"X-Client-Id": "abcd"})
        assert r.status_code == 422

    def test_non_hex_rejected(self, client):
        r = client.get(
            "/api/v1/scenarios",
            headers={"X-Client-Id": "spaces and !@#$ are not allowed!!"},
        )
        assert r.status_code == 422

    def test_xss_attempt_rejected(self, client):
        r = client.get(
            "/api/v1/scenarios",
            headers={"X-Client-Id": "<script>alert(1)</script>"},
        )
        assert r.status_code == 422

    def test_valid_uuid_accepted(self, client):
        r = client.get("/api/v1/scenarios", headers={"X-Client-Id": _new_client_id()})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Body-size cap
# ─────────────────────────────────────────────────────────────────────────────


class TestBodySizeLimit:
    def test_oversized_body_rejected(self, client):
        big = b"{" + (b"\"x\":\"" + b"a" * 8) * 600 + b"\"}}"
        assert len(big) > 2048
        r = client.post(
            "/api/v1/simulate",
            content=big,
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 413
        assert r.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"

    def test_normal_body_allowed(self, client):
        # The simulate route may 422 or 5xx if seed data is missing — we just
        # need to confirm body-size middleware lets it through.
        r = client.post("/api/v1/simulate", json=_ok_simulate_payload())
        assert r.status_code != 413


# ─────────────────────────────────────────────────────────────────────────────
# 3. Schema guards (date range, symbols, amounts, weights, duplicates)
# ─────────────────────────────────────────────────────────────────────────────


class TestScenarioSchemaGuards:
    def test_start_date_before_2000_rejected(self, client):
        p = _ok_simulate_payload()
        p["start_date"] = "1990-01-01"
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422
        assert r.json()["error"]["code"] == "INVALID_INPUT"

    def test_end_date_in_future_rejected(self, client):
        p = _ok_simulate_payload()
        p["end_date"] = "2099-01-01"
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422

    def test_initial_amount_above_cap_rejected(self, client):
        p = _ok_simulate_payload()
        p["initial_amount"] = "999999999999"  # well above the 1e10 cap
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422

    def test_recurring_amount_above_cap_rejected(self, client):
        p = _ok_simulate_payload()
        p["recurring_amount"] = "9999999999"  # 10 billion (recurring cap is 1B)
        p["recurring_freq"] = "monthly"
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422

    def test_invalid_symbol_rejected(self, client):
        p = _ok_simulate_payload()
        p["positions"] = [{"symbol": "<script>", "weight_pct": "100"}]
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422

    def test_lowercase_symbol_normalized_then_validated(self, client):
        p = _ok_simulate_payload()
        # Lowercase is uppercased by the validator. After upper(), still has
        # invalid chars only if non-alnum. Pure lowercase letters become valid.
        p["positions"] = [{"symbol": "aapl", "weight_pct": "100"}]
        r = client.post("/api/v1/simulate", json=p)
        # Either 422 (validation OK but seed data missing) or 200 if seeded —
        # what we *don't* want is a 500.
        assert r.status_code != 500

    def test_basket_weights_must_sum_100(self, client):
        p = _ok_simulate_payload()
        p["mode"] = "basket"
        p["positions"] = [
            {"symbol": "AAPL", "weight_pct": "60"},
            {"symbol": "SPY", "weight_pct": "30"},  # sums to 90
        ]
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422

    def test_duplicate_symbols_in_basket_rejected(self, client):
        p = _ok_simulate_payload()
        p["mode"] = "basket"
        p["positions"] = [
            {"symbol": "AAPL", "weight_pct": "50"},
            {"symbol": "AAPL", "weight_pct": "50"},
        ]
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422

    def test_zero_amount_rejected(self, client):
        p = _ok_simulate_payload()
        p["initial_amount"] = "0"
        p["recurring_amount"] = "0"
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422

    def test_more_than_10_positions_rejected(self, client):
        p = _ok_simulate_payload()
        p["mode"] = "basket"
        p["positions"] = [
            {"symbol": f"T{i:02d}", "weight_pct": str(round(100 / 11, 2))}
            for i in range(11)
        ]
        r = client.post("/api/v1/simulate", json=p)
        assert r.status_code == 422

    def test_50_year_range_boundary(self, client):
        # End date in the future is blocked, so we use 2010 → today.
        # Just confirm the validator runs cleanly on an OK range.
        p = _ok_simulate_payload()
        p["start_date"] = "2010-01-04"
        # End is well within bounds.
        r = client.post("/api/v1/simulate", json=p)
        # 422 (no seed) or 200; never 500.
        assert r.status_code != 500


# ─────────────────────────────────────────────────────────────────────────────
# 4. Rate limiting
# ─────────────────────────────────────────────────────────────────────────────


class TestRateLimit:
    def test_heavy_endpoint_returns_429_with_retry_after(self, client):
        # Heavy bucket = 3/min in test env.
        last = None
        for _ in range(8):
            last = client.post("/api/v1/simulate", json=_ok_simulate_payload())
            if last.status_code == 429:
                break
        assert last is not None
        assert last.status_code == 429
        assert last.json()["error"]["code"] == "RATE_LIMITED"
        assert last.headers.get("retry-after") is not None
        # Should also have the security headers attached.
        assert last.headers.get("x-content-type-options") == "nosniff"

    def test_health_endpoint_is_exempt(self, client):
        # Hammer /health and confirm it never 429s.
        for _ in range(120):
            r = client.get("/health")
            assert r.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# 5. Security response headers (defense in depth)
# ─────────────────────────────────────────────────────────────────────────────


class TestSecurityHeaders:
    def test_baseline_headers_present_on_api(self, client):
        r = client.get("/api/v1/methodology")
        assert r.headers.get("x-content-type-options") == "nosniff"
        assert r.headers.get("x-frame-options") == "DENY"
        assert "strict-origin" in (r.headers.get("referrer-policy") or "")
        assert "camera=()" in (r.headers.get("permissions-policy") or "")
        assert r.headers.get("cache-control") == "no-store"

    def test_baseline_headers_present_on_errors(self, client):
        r = client.get("/api/v1/scenarios")  # 422 (no client id)
        assert r.status_code == 422
        assert r.headers.get("x-content-type-options") == "nosniff"


# ─────────────────────────────────────────────────────────────────────────────
# 6. Error envelope shape — never echo user input back
# ─────────────────────────────────────────────────────────────────────────────


class TestErrorEnvelope:
    def test_validation_error_does_not_reflect_input(self, client):
        secret = "MY-SECRET-VALUE-XYZ-NOT-IN-SCHEMA"
        body = ('{"junk":"' + secret + '"}').encode()
        r = client.post(
            "/api/v1/simulate",
            content=body,
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 422
        assert secret not in r.text

    def test_404_uses_envelope(self, client):
        r = client.get(
            "/api/v1/scenarios/999999999",
            headers={"X-Client-Id": _new_client_id()},
        )
        assert r.status_code == 404
        body = r.json()
        assert body["error"]["code"] == "NOT_FOUND"
        assert "message" in body["error"]


# ─────────────────────────────────────────────────────────────────────────────
# 7. CORS posture — no credentials, scoped origins
# ─────────────────────────────────────────────────────────────────────────────


class TestCORS:
    def test_disallowed_origin_does_not_get_acao(self, client):
        r = client.options(
            "/api/v1/methodology",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        # Starlette returns 400 for unmatched origins on preflight; either way
        # the ACAO header must not echo the disallowed origin.
        assert r.headers.get("access-control-allow-origin") not in (
            "https://evil.example.com",
            "*",
        )

    def test_allowed_origin_is_echoed(self, client):
        r = client.options(
            "/api/v1/methodology",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
