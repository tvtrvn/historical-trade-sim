"""Pydantic v2 base config + tiny shared schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class APIModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class HealthResponse(APIModel):
    status: str
    env: str
    version: str
