"""Initial schema.

Revision ID: 0001_init
Revises:
Create Date: 2026-04-29

"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0001_init"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "securities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=16), nullable=False, unique=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("exchange", sa.String(length=16), nullable=False, server_default="NASDAQ"),
        sa.Column("asset_class", sa.String(length=16), nullable=False, server_default="equity"),
        sa.Column("logo_url", sa.String(length=256), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_securities_symbol", "securities", ["symbol"])
    op.create_index("ix_securities_symbol_lower", "securities", ["symbol"])

    op.create_table(
        "benchmarks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=16), nullable=False, unique=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("logo_url", sa.String(length=256), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_benchmarks_symbol", "benchmarks", ["symbol"])

    op.create_table(
        "historical_prices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("security_id", sa.Integer(), sa.ForeignKey("securities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("price_date", sa.Date(), nullable=False),
        sa.Column("close_price", sa.Numeric(18, 6), nullable=False),
        sa.Column("adj_close", sa.Numeric(18, 6), nullable=False),
        sa.Column("volume", sa.BigInteger(), nullable=True),
        sa.UniqueConstraint("security_id", "price_date", name="uq_price_per_day"),
    )
    op.create_index("ix_historical_prices_security_id", "historical_prices", ["security_id"])
    op.create_index("ix_prices_security_date", "historical_prices", ["security_id", "price_date"])

    scenario_mode = sa.Enum("single", "basket", name="scenario_mode")
    recurring_freq = sa.Enum("none", "monthly", "quarterly", name="recurring_frequency")

    op.create_table(
        "scenarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("mode", scenario_mode, nullable=False, server_default="single"),
        sa.Column("benchmark_symbol", sa.String(length=16), nullable=False, server_default="SPY"),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("initial_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("recurring_amount", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("recurring_freq", recurring_freq, nullable=False, server_default="none"),
        sa.Column("fees_pct", sa.Numeric(8, 4), nullable=False, server_default="0"),
        # `TRUE` works on Postgres 8+ AND SQLite 3.23+ (Python 3.11 ships ≥ 3.40);
        # `1` is SQLite-only and Postgres rejects it with a type mismatch.
        sa.Column("dividend_reinvest", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_scenarios_client_id", "scenarios", ["client_id"])

    op.create_table(
        "scenario_positions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("symbol", sa.String(length=16), nullable=False),
        sa.Column("weight_pct", sa.Numeric(8, 4), nullable=False),
    )
    op.create_index("ix_scenario_positions_scenario_id", "scenario_positions", ["scenario_id"])

    op.create_table(
        "scenario_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("final_value", sa.Numeric(18, 2), nullable=False),
        sa.Column("invested_total", sa.Numeric(18, 2), nullable=False),
        sa.Column("total_return_pct", sa.Numeric(12, 4), nullable=False),
        sa.Column("cagr_pct", sa.Numeric(12, 4), nullable=False),
        sa.Column("volatility_pct", sa.Numeric(12, 4), nullable=False),
        sa.Column("max_drawdown_pct", sa.Numeric(12, 4), nullable=False),
        sa.Column("sharpe_like", sa.Numeric(12, 4), nullable=False),
        sa.Column("benchmark_final_value", sa.Numeric(18, 2), nullable=False),
        sa.Column("benchmark_total_return_pct", sa.Numeric(12, 4), nullable=False),
        sa.Column("benchmark_cagr_pct", sa.Numeric(12, 4), nullable=False),
        sa.Column("relative_return_pct", sa.Numeric(12, 4), nullable=False),
        sa.Column("run_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_scenario_results_scenario_id", "scenario_results", ["scenario_id"])

    op.create_table(
        "annual_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_result_id", sa.Integer(), sa.ForeignKey("scenario_results.id", ondelete="CASCADE"), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("portfolio_return_pct", sa.Numeric(12, 4), nullable=False),
        sa.Column("benchmark_return_pct", sa.Numeric(12, 4), nullable=False),
        sa.UniqueConstraint("scenario_result_id", "year", name="uq_annual_year"),
    )
    op.create_index("ix_annual_metrics_scenario_result_id", "annual_metrics", ["scenario_result_id"])

    op.create_table(
        "comparison_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("scenario_a_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scenario_b_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_comparison_runs_client_id", "comparison_runs", ["client_id"])


def downgrade() -> None:
    op.drop_table("comparison_runs")
    op.drop_table("annual_metrics")
    op.drop_table("scenario_results")
    op.drop_table("scenario_positions")
    op.drop_table("scenarios")
    op.drop_table("historical_prices")
    op.drop_table("benchmarks")
    op.drop_table("securities")
    sa.Enum(name="recurring_frequency").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="scenario_mode").drop(op.get_bind(), checkfirst=True)
