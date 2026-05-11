/** API DTO types — kept hand-typed to mirror the backend schema. */

export type ScenarioMode = 'single' | 'basket';
export type RecurringFrequency = 'none' | 'monthly' | 'quarterly';
export type TradeKind = 'initial' | 'recurring';

export interface Security {
  id: number;
  symbol: string;
  name: string;
  exchange: string;
  asset_class: string;
  logo_url: string | null;
}

export interface Benchmark {
  id: number;
  symbol: string;
  name: string;
  description: string;
  logo_url: string | null;
}

export interface PositionIn {
  symbol: string;
  weight_pct: number | string;
}

export interface ScenarioIn {
  name: string;
  mode: ScenarioMode;
  benchmark_symbol: string;
  start_date: string; // ISO yyyy-MM-dd
  end_date: string;
  initial_amount: number | string;
  recurring_amount: number | string;
  recurring_freq: RecurringFrequency;
  fees_pct: number | string;
  dividend_reinvest: boolean;
  positions: PositionIn[];
}

export interface TimeseriesPoint {
  date: string;
  value: string;
  invested: string;
  benchmark_value: string;
  drawdown_pct: string;
}

export interface TradeEvent {
  date: string;
  symbol: string;
  price: string;
  shares: string;
  amount: string;
  kind: TradeKind;
}

export interface PositionContribution {
  symbol: string;
  weight_pct: string;
  invested: string;
  final_value: string;
  contribution_pct: string;
}

export interface AnnualMetric {
  year: number;
  portfolio_return_pct: string;
  benchmark_return_pct: string;
}

export interface ScenarioResultPayload {
  timeseries: TimeseriesPoint[];
  trades: TradeEvent[];
  contributions: PositionContribution[];
}

export interface ScenarioResult {
  id: number;
  run_at: string;
  final_value: string;
  invested_total: string;
  total_return_pct: string;
  cagr_pct: string;
  volatility_pct: string;
  max_drawdown_pct: string;
  sharpe_like: string;
  benchmark_final_value: string;
  benchmark_total_return_pct: string;
  benchmark_cagr_pct: string;
  relative_return_pct: string;
  annual_metrics: AnnualMetric[];
  payload: ScenarioResultPayload;
  run_ms: number;
}

export interface ScenarioOut {
  id: number;
  name: string;
  mode: ScenarioMode;
  benchmark_symbol: string;
  start_date: string;
  end_date: string;
  initial_amount: string;
  recurring_amount: string;
  recurring_freq: RecurringFrequency;
  fees_pct: string;
  dividend_reinvest: boolean;
  created_at: string;
  positions: { symbol: string; weight_pct: string }[];
  latest_result: ScenarioResult | null;
}

export interface ScenarioListItem {
  id: number;
  name: string;
  mode: ScenarioMode;
  benchmark_symbol: string;
  start_date: string;
  end_date: string;
  created_at: string;
  positions: { symbol: string; weight_pct: string }[];
  latest_summary: {
    final_value: string;
    total_return_pct: string;
    cagr_pct: string;
    max_drawdown_pct: string;
    relative_return_pct: string;
    run_at: string;
  } | null;
}

export interface ApiError {
  error: { code: string; message: string; field: string | null };
}
