"""Shared FastAPI dependencies."""

from __future__ import annotations

import re

from fastapi import Header

from app.core.errors import ValidationError

# Accept a UUID (with or without hyphens) or a 16-64 char hex token. This still
# lets the frontend's localStorage UUID through, but rejects obvious garbage
# like "12345678" or arbitrary strings. We deliberately do NOT version-check
# UUIDs — older browsers may polyfill differently.
_CLIENT_ID_RE = re.compile(r"^[A-Fa-f0-9\-]{16,64}$")


def require_client_id(x_client_id: str | None = Header(default=None)) -> str:
    """Frontend must send a stable UUID per browser. We validate format only.

    This is anonymous, single-user, demo-style auth — no server-side issuance.
    Tightening the format raises the bar against bots scanning short/guessable
    IDs.
    """
    if not x_client_id:
        raise ValidationError("Missing X-Client-Id header.", field="x_client_id")
    if not _CLIENT_ID_RE.match(x_client_id):
        raise ValidationError(
            "Invalid X-Client-Id header format.",
            field="x_client_id",
        )
    return x_client_id
