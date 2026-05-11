"""Typed application settings.

Settings are read once and cached. Anything that varies between
environments lives here, not in business logic.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    env: str = Field(default="development")
    database_url: str = Field(default="sqlite+aiosqlite:///./local.db")
    cors_allow_origins: str = Field(default="http://localhost:5173")

    # ── Security / abuse protection ────────────────────────────────────────
    # Per-IP global rate limit (across all routes).
    rate_limit_per_minute: int = Field(default=120, ge=10, le=10_000)
    # Stricter limit for compute-heavy endpoints (/simulate, /scenarios POST/run/duplicate).
    heavy_rate_limit_per_minute: int = Field(default=20, ge=1, le=1_000)
    # Hard cap on request body bytes. The API never receives large payloads.
    max_body_bytes: int = Field(default=64 * 1024, ge=1024, le=10 * 1024 * 1024)
    # Per-client cap on saved scenarios (anti-spam).
    max_scenarios_per_client: int = Field(default=100, ge=10, le=10_000)
    # Trust X-Forwarded-For for client-IP detection (set true behind a known proxy/CDN).
    trust_proxy: bool = Field(default=False)

    # ── Storage TTL (cleanup job) ──────────────────────────────────────────
    # How many days of scenario_results to keep. The /maintenance/cleanup job
    # deletes rows older than this. Scenarios themselves are never deleted —
    # the user can always re-run them.
    result_retention_days: int = Field(default=30, ge=1, le=3650)
    # Shared secret for the maintenance endpoint. Empty disables the endpoint
    # entirely (recommended for local dev). Generate with `openssl rand -hex 32`.
    maintenance_token: str = Field(default="")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]

    @property
    def database_url_sync(self) -> str:
        """SQLAlchemy URL Alembic should use (sync drivers only)."""
        url = self.database_url
        url = url.replace("+asyncpg", "+psycopg2")
        url = url.replace("+aiosqlite", "")
        return url

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
