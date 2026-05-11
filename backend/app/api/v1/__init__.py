"""API v1 router."""

from fastapi import APIRouter

from app.api.v1 import (
    benchmarks,
    maintenance,
    methodology,
    scenarios,
    securities,
    simulate,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(securities.router)
api_router.include_router(benchmarks.router)
api_router.include_router(simulate.router)
api_router.include_router(scenarios.router)
api_router.include_router(methodology.router)
api_router.include_router(maintenance.router)
