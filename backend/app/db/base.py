"""SQLAlchemy declarative base + async session factory."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import DateTime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import get_settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Project-wide declarative base."""


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


# asyncpg query-param incompatibilities. libpq (psycopg2) accepts these in the
# URL query string; asyncpg does not — it raises ``TypeError: connect() got
# an unexpected keyword argument 'X'`` on the first query. We translate them
# at engine-creation time so the canonical ``database_url`` (also used by
# Alembic via the sync URL) stays pristine and copy-pasteable from Neon's
# dashboard.
_ASYNCPG_INCOMPATIBLE_PARAMS = {"sslmode", "channel_binding"}
_SSL_REQUIRED_VALUES = {"require", "verify-ca", "verify-full", "prefer", "allow"}


def _build_async_engine_args(url: str) -> tuple[str, dict[str, Any]]:
    """Return ``(cleaned_url, connect_args)`` for ``create_async_engine``.

    For non-asyncpg URLs (e.g. SQLite) this is a no-op. For asyncpg URLs:
      * strip ``sslmode`` + ``channel_binding`` from the query string;
      * if ``sslmode`` requested TLS, set ``connect_args={"ssl": True}``.
    SCRAM channel binding is negotiated automatically when both sides
    support it, so the explicit param is safe to drop.
    """
    connect_args: dict[str, Any] = {}
    if "+asyncpg" not in url:
        return url, connect_args

    parts = urlsplit(url)
    if not parts.query:
        return url, connect_args

    kept: list[tuple[str, str]] = []
    for k, v in parse_qsl(parts.query, keep_blank_values=True):
        if k.lower() not in _ASYNCPG_INCOMPATIBLE_PARAMS:
            kept.append((k, v))
            continue
        if k.lower() == "sslmode" and v.lower() in _SSL_REQUIRED_VALUES:
            connect_args["ssl"] = True

    cleaned = urlunsplit(parts._replace(query=urlencode(kept)))
    return cleaned, connect_args


_settings = get_settings()
_async_url, _async_connect_args = _build_async_engine_args(_settings.database_url)
_engine = create_async_engine(
    _async_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=_async_connect_args,
)
async_session_factory = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session
