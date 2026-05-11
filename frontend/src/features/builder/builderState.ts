import { create } from 'zustand';
import type { ScenarioIn, RecurringFrequency, ScenarioMode } from '@/lib/api/types';

export interface BuilderPosition {
  symbol: string;
  weight_pct: number;
}

interface BuilderState {
  name: string;
  mode: ScenarioMode;
  benchmark_symbol: string;
  start_date: string;
  end_date: string;
  initial_amount: number;
  recurring_amount: number;
  recurring_freq: RecurringFrequency;
  fees_pct: number;
  dividend_reinvest: boolean;
  positions: BuilderPosition[];

  set: <K extends keyof BuilderState>(k: K, v: BuilderState[K]) => void;
  setPositions: (p: BuilderPosition[]) => void;
  loadFromInput: (s: ScenarioIn) => void;
  reset: () => void;
}

const DEFAULT: Omit<BuilderState, 'set' | 'setPositions' | 'loadFromInput' | 'reset'> = {
  name: 'My scenario',
  mode: 'single',
  benchmark_symbol: 'SPY',
  start_date: '2015-01-02',
  end_date: '2026-04-29',
  initial_amount: 10000,
  recurring_amount: 0,
  recurring_freq: 'none',
  fees_pct: 0,
  dividend_reinvest: true,
  positions: [{ symbol: 'AAPL', weight_pct: 100 }],
};

export const useBuilderStore = create<BuilderState>((setRaw) => ({
  ...DEFAULT,
  set: (k, v) => setRaw({ [k]: v } as Partial<BuilderState>),
  setPositions: (p) => setRaw({ positions: p }),
  loadFromInput: (s) =>
    setRaw({
      name: s.name,
      mode: s.mode,
      benchmark_symbol: s.benchmark_symbol,
      start_date: s.start_date,
      end_date: s.end_date,
      initial_amount: Number(s.initial_amount),
      recurring_amount: Number(s.recurring_amount),
      recurring_freq: s.recurring_freq,
      fees_pct: Number(s.fees_pct),
      dividend_reinvest: s.dividend_reinvest,
      positions: s.positions.map((p) => ({
        symbol: p.symbol,
        weight_pct: Number(p.weight_pct),
      })),
    }),
  reset: () => setRaw(DEFAULT),
}));

export function builderToScenarioIn(s: BuilderState): ScenarioIn {
  return {
    name: s.name,
    mode: s.mode,
    benchmark_symbol: s.benchmark_symbol,
    start_date: s.start_date,
    end_date: s.end_date,
    initial_amount: s.initial_amount,
    recurring_amount: s.recurring_amount,
    recurring_freq: s.recurring_freq,
    fees_pct: s.fees_pct,
    dividend_reinvest: s.dividend_reinvest,
    positions: s.positions.map((p) => ({ symbol: p.symbol, weight_pct: p.weight_pct })),
  };
}

export function builderValidationErrors(s: BuilderState): string[] {
  const errors: string[] = [];
  if (new Date(s.end_date) <= new Date(s.start_date))
    errors.push('End date must be after start date.');
  if (s.initial_amount <= 0 && s.recurring_amount <= 0)
    errors.push('Set an initial amount or a recurring amount above zero.');
  if (s.mode === 'basket') {
    const total = s.positions.reduce((sum, p) => sum + p.weight_pct, 0);
    if (Math.abs(total - 100) > 0.01) errors.push(`Basket weights must sum to 100% (got ${total}).`);
    if (s.positions.length < 2) errors.push('Basket mode requires at least 2 positions.');
  }
  if (s.mode === 'single' && s.positions.length !== 1)
    errors.push('Single mode requires exactly one position.');
  if (s.positions.some((p) => !p.symbol)) errors.push('Pick a ticker for every position.');
  return errors;
}
