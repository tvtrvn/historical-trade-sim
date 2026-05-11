"""Securities catalog endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_session
from app.models import Security
from app.schemas.security import SecurityOut

router = APIRouter(prefix="/securities", tags=["securities"])


@router.get("", response_model=list[SecurityOut])
async def list_securities(
    db: AsyncSession = Depends(get_session),
    limit: int = Query(default=200, le=500),
) -> list[SecurityOut]:
    rows = (
        await db.execute(select(Security).order_by(Security.symbol).limit(limit))
    ).scalars().all()
    return [SecurityOut.model_validate(r) for r in rows]


@router.get("/search", response_model=list[SecurityOut])
async def search_securities(
    q: str = Query(min_length=1, max_length=32),
    db: AsyncSession = Depends(get_session),
) -> list[SecurityOut]:
    needle = f"%{q.upper()}%"
    rows = (
        await db.execute(
            select(Security)
            .where(or_(Security.symbol.ilike(needle), Security.name.ilike(needle)))
            .order_by(Security.symbol)
            .limit(20)
        )
    ).scalars().all()
    return [SecurityOut.model_validate(r) for r in rows]
