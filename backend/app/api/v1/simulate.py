"""Run a simulation without persisting it."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_session
from app.schemas.scenario import ScenarioIn, ScenarioResultOut
from app.services.simulator import run_simulation_from_input

router = APIRouter(prefix="/simulate", tags=["simulate"])


@router.post("", response_model=ScenarioResultOut)
async def simulate(
    payload: ScenarioIn,
    db: AsyncSession = Depends(get_session),
) -> ScenarioResultOut:
    return await run_simulation_from_input(db, payload)
