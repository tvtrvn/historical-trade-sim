"""Saved scenarios CRUD + run + duplicate + compare."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.deps import require_client_id
from app.core.errors import NotFoundError
from app.db.base import get_session
from app.models import Scenario, ScenarioPosition
from app.schemas.scenario import (
    CompareIn,
    CompareOut,
    ScenarioIn,
    ScenarioListItem,
    ScenarioOut,
)
from app.services import simulator

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioListItem])
async def list_scenarios(
    client_id: str = Depends(require_client_id),
    db: AsyncSession = Depends(get_session),
) -> list[ScenarioListItem]:
    return await simulator.list_scenarios_for_client(db, client_id)


@router.post("", response_model=ScenarioOut, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    payload: ScenarioIn,
    client_id: str = Depends(require_client_id),
    db: AsyncSession = Depends(get_session),
) -> ScenarioOut:
    sc = await simulator.save_scenario(db, client_id=client_id, scenario_in=payload)
    await simulator.run_and_persist(db, sc)
    sc = await simulator.fetch_scenario_full(db, client_id=client_id, scenario_id=sc.id)
    return simulator.scenario_to_out(sc)


@router.get("/{scenario_id}", response_model=ScenarioOut)
async def get_scenario(
    scenario_id: int,
    client_id: str = Depends(require_client_id),
    db: AsyncSession = Depends(get_session),
) -> ScenarioOut:
    sc = await simulator.fetch_scenario_full(db, client_id=client_id, scenario_id=scenario_id)
    return simulator.scenario_to_out(sc)


@router.post("/{scenario_id}/run", response_model=ScenarioOut)
async def rerun_scenario(
    scenario_id: int,
    client_id: str = Depends(require_client_id),
    db: AsyncSession = Depends(get_session),
) -> ScenarioOut:
    sc = await simulator.fetch_scenario_full(db, client_id=client_id, scenario_id=scenario_id)
    await simulator.run_and_persist(db, sc)
    sc = await simulator.fetch_scenario_full(db, client_id=client_id, scenario_id=scenario_id)
    return simulator.scenario_to_out(sc)


@router.post("/{scenario_id}/duplicate", response_model=ScenarioOut, status_code=status.HTTP_201_CREATED)
async def duplicate_scenario(
    scenario_id: int,
    client_id: str = Depends(require_client_id),
    db: AsyncSession = Depends(get_session),
) -> ScenarioOut:
    sc = await simulator.fetch_scenario_full(db, client_id=client_id, scenario_id=scenario_id)
    new = Scenario(
        client_id=client_id,
        name=f"{sc.name} (copy)",
        mode=sc.mode,
        benchmark_symbol=sc.benchmark_symbol,
        start_date=sc.start_date,
        end_date=sc.end_date,
        initial_amount=sc.initial_amount,
        recurring_amount=sc.recurring_amount,
        recurring_freq=sc.recurring_freq,
        fees_pct=sc.fees_pct,
        dividend_reinvest=sc.dividend_reinvest,
        positions=[
            ScenarioPosition(symbol=p.symbol, weight_pct=p.weight_pct) for p in sc.positions
        ],
    )
    db.add(new)
    await db.commit()
    await db.refresh(new, attribute_names=["positions"])
    await simulator.run_and_persist(db, new)
    new = await simulator.fetch_scenario_full(db, client_id=client_id, scenario_id=new.id)
    return simulator.scenario_to_out(new)


@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: int,
    client_id: str = Depends(require_client_id),
    db: AsyncSession = Depends(get_session),
) -> Response:
    sc = (
        await db.execute(
            select(Scenario)
            .options(selectinload(Scenario.positions), selectinload(Scenario.results))
            .where(Scenario.id == scenario_id)
            .where(Scenario.client_id == client_id)
        )
    ).scalar_one_or_none()
    if not sc:
        raise NotFoundError("Scenario not found")
    await db.delete(sc)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/compare", response_model=CompareOut)
async def compare(
    payload: CompareIn,
    client_id: str = Depends(require_client_id),
    db: AsyncSession = Depends(get_session),
) -> CompareOut:
    a = await simulator.fetch_scenario_full(
        db, client_id=client_id, scenario_id=payload.scenario_a_id
    )
    b = await simulator.fetch_scenario_full(
        db, client_id=client_id, scenario_id=payload.scenario_b_id
    )
    return CompareOut(
        scenario_a=simulator.scenario_to_out(a),
        scenario_b=simulator.scenario_to_out(b),
    )
