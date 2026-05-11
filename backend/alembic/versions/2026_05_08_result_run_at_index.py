"""Index ``scenario_results.run_at`` for TTL cleanup.

The TTL job (``app.services.maintenance.cleanup_old_results``) issues a
``DELETE … WHERE run_at < :cutoff`` once a day. Without this index, that
delete is a full table scan; with it, it's a fast range scan.

Revision ID: 0002_result_run_at_index
Revises: 0001_init
Create Date: 2026-05-08

"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op


revision: str = "0002_result_run_at_index"
down_revision: str | None = "0001_init"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_scenario_results_run_at",
        "scenario_results",
        ["run_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_scenario_results_run_at", table_name="scenario_results")
