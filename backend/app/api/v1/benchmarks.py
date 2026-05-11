"""Benchmark catalog endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_session
from app.models import Benchmark
from app.schemas.security import BenchmarkOut

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


@router.get("", response_model=list[BenchmarkOut])
async def list_benchmarks(db: AsyncSession = Depends(get_session)) -> list[BenchmarkOut]:
    rows = (await db.execute(select(Benchmark).order_by(Benchmark.symbol))).scalars().all()
    return [BenchmarkOut.model_validate(r) for r in rows]
