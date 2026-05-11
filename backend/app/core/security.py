"""Defense-in-depth middleware: rate limiting, body-size cap, hardened headers.

The rate limiter is an in-process token bucket keyed by client IP.
It is intentionally simple and dependency-free — good enough for a single-instance
deploy on Koyeb. For multi-instance fleets, swap the bucket store for Redis.

Heavy endpoints (anything that runs the simulation engine, mutates the DB, or
both) get a tighter bucket so an attacker can't drain CPU by spraying simulate.
"""

from __future__ import annotations

import time
from collections import OrderedDict
from collections.abc import Awaitable, Callable
from typing import ClassVar, Final

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _client_ip(request: Request, *, trust_proxy: bool) -> str:
    """Best-effort client IP. Honors X-Forwarded-For only when trust_proxy is on."""
    if trust_proxy:
        fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
        if fwd:
            return fwd.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _error_response(status_code: int, code: str, message: str, *, retry_after: int | None = None) -> JSONResponse:
    headers: dict[str, str] = {}
    if retry_after is not None:
        headers["Retry-After"] = str(retry_after)
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "field": None}},
        headers=headers,
    )


async def _send_error(send: Send, status_code: int, code: str, message: str) -> None:
    """Pure-ASGI error sender, used from middlewares that don't have a Request."""
    body = (
        b'{"error":{"code":"' + code.encode("ascii")
        + b'","message":"' + message.encode("utf-8").replace(b'"', b'\\"')
        + b'","field":null}}'
    )
    await send(
        {
            "type": "http.response.start",
            "status": status_code,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("ascii")),
                (b"x-content-type-options", b"nosniff"),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body, "more_body": False})


# ─────────────────────────────────────────────────────────────────────────────
# Rate limiting
# ─────────────────────────────────────────────────────────────────────────────


class _Bucket:
    """A single token bucket. Refills at `rate` tokens per `window` seconds."""

    __slots__ = ("tokens", "capacity", "rate_per_sec", "last_ts")

    def __init__(self, capacity: int, refill_per_minute: int) -> None:
        self.capacity: float = float(capacity)
        self.tokens: float = float(capacity)
        self.rate_per_sec: float = float(refill_per_minute) / 60.0
        self.last_ts: float = time.monotonic()

    def take(self, cost: float = 1.0) -> tuple[bool, float]:
        """Take `cost` tokens. Returns (allowed, retry_after_seconds)."""
        now = time.monotonic()
        elapsed = max(0.0, now - self.last_ts)
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate_per_sec)
        self.last_ts = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True, 0.0
        deficit = cost - self.tokens
        retry = deficit / self.rate_per_sec if self.rate_per_sec > 0 else 60.0
        return False, retry


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP global + heavy-endpoint token-bucket rate limiter.

    Health checks and CORS preflights are exempt. Buckets evict in LRU fashion
    so the in-memory footprint stays bounded under attack.
    """

    EXEMPT_PATHS: ClassVar[frozenset[str]] = frozenset({"/health"})
    HEAVY_PATH_PREFIXES: ClassVar[tuple[str, ...]] = (
        "/api/v1/simulate",
        "/api/v1/scenarios",  # POST/run/duplicate; GETs still budget against the global limit
    )
    HEAVY_METHODS: ClassVar[frozenset[str]] = frozenset({"POST", "PUT", "PATCH", "DELETE"})

    MAX_BUCKETS: Final[int] = 4096

    def __init__(
        self,
        app: ASGIApp,
        *,
        global_per_minute: int,
        heavy_per_minute: int,
        trust_proxy: bool,
    ) -> None:
        super().__init__(app)
        self.global_per_minute = global_per_minute
        self.heavy_per_minute = heavy_per_minute
        self.trust_proxy = trust_proxy
        self._global: OrderedDict[str, _Bucket] = OrderedDict()
        self._heavy: OrderedDict[str, _Bucket] = OrderedDict()

    def _get(self, store: OrderedDict[str, _Bucket], key: str, capacity: int, refill_per_minute: int) -> _Bucket:
        bucket = store.get(key)
        if bucket is None:
            bucket = _Bucket(capacity=capacity, refill_per_minute=refill_per_minute)
            store[key] = bucket
            if len(store) > self.MAX_BUCKETS:
                store.popitem(last=False)
        else:
            store.move_to_end(key)
        return bucket

    def _is_heavy(self, request: Request) -> bool:
        path = request.url.path
        return any(path.startswith(p) for p in self.HEAVY_PATH_PREFIXES) and (
            request.method in self.HEAVY_METHODS or path.endswith("/run") or path.endswith("/duplicate")
        )

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method == "OPTIONS" or request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        ip = _client_ip(request, trust_proxy=self.trust_proxy)

        global_bucket = self._get(self._global, ip, self.global_per_minute, self.global_per_minute)
        ok, retry = global_bucket.take()
        if not ok:
            return _error_response(
                429,
                "RATE_LIMITED",
                "Too many requests. Slow down and try again shortly.",
                retry_after=max(1, int(retry)),
            )

        if self._is_heavy(request):
            heavy_bucket = self._get(self._heavy, ip, self.heavy_per_minute, self.heavy_per_minute)
            ok, retry = heavy_bucket.take()
            if not ok:
                return _error_response(
                    429,
                    "RATE_LIMITED",
                    "This endpoint is rate-limited. Wait a moment before retrying.",
                    retry_after=max(1, int(retry)),
                )

        return await call_next(request)


# ─────────────────────────────────────────────────────────────────────────────
# Body-size cap
# ─────────────────────────────────────────────────────────────────────────────


class BodySizeLimitMiddleware:
    """Reject payloads larger than ``max_bytes`` early, before route handlers
    parse them.

    Implemented as a pure ASGI middleware (not BaseHTTPMiddleware) so the
    intercepted body is correctly replayed to downstream handlers — Starlette's
    BaseHTTPMiddleware does not propagate body replay across its boundary.
    """

    def __init__(self, app: ASGIApp, *, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        if method in ("GET", "HEAD", "OPTIONS"):
            await self.app(scope, receive, send)
            return

        # Cheap fast-path: trust Content-Length when the client provides one.
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    if int(value.decode("latin-1")) > self.max_bytes:
                        await _send_error(send, 413, "PAYLOAD_TOO_LARGE",
                                          f"Request body exceeds {self.max_bytes} bytes.")
                        return
                except ValueError:
                    await _send_error(send, 400, "INVALID_REQUEST",
                                      "Invalid Content-Length header.")
                    return
                break

        # Defense in depth: count actual bytes as we read them. If the client
        # lies about content-length or streams chunked, we still cap.
        received: list[Message] = []
        total = 0
        more = True
        while more:
            msg = await receive()
            if msg["type"] != "http.request":
                received.append(msg)
                more = False
                continue
            body = msg.get("body") or b""
            total += len(body)
            if total > self.max_bytes:
                await _send_error(send, 413, "PAYLOAD_TOO_LARGE",
                                  f"Request body exceeds {self.max_bytes} bytes.")
                return
            received.append(msg)
            more = msg.get("more_body", False)

        # Replay every collected message exactly once, in order.
        idx = 0

        async def _replay() -> Message:
            nonlocal idx
            if idx < len(received):
                msg = received[idx]
                idx += 1
                return msg
            return await receive()

        await self.app(scope, _replay, send)


# ─────────────────────────────────────────────────────────────────────────────
# Hardened response headers
# ─────────────────────────────────────────────────────────────────────────────


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds OWASP-recommended baseline headers to every response."""

    def __init__(self, app: ASGIApp, *, is_production: bool) -> None:
        super().__init__(app)
        self.is_production = is_production

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        h = response.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
        h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        h.setdefault("Cross-Origin-Resource-Policy", "same-site")
        # Don't ever cache JSON API responses.
        if request.url.path.startswith("/api/"):
            h.setdefault("Cache-Control", "no-store")
        if self.is_production:
            h.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response
