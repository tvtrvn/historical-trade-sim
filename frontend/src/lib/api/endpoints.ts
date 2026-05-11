import { api } from './client';
import type {
  Benchmark,
  ScenarioIn,
  ScenarioListItem,
  ScenarioOut,
  ScenarioResult,
  Security,
} from './types';

export const apiEndpoints = {
  health: () => api<{ status: string; env: string; version: string }>('/health'),

  listSecurities: () => api<Security[]>('/api/v1/securities?limit=200'),
  searchSecurities: (q: string) =>
    api<Security[]>(`/api/v1/securities/search?q=${encodeURIComponent(q)}`),
  listBenchmarks: () => api<Benchmark[]>('/api/v1/benchmarks'),

  simulate: (payload: ScenarioIn) =>
    api<ScenarioResult>('/api/v1/simulate', { method: 'POST', body: payload }),

  listScenarios: () => api<ScenarioListItem[]>('/api/v1/scenarios'),
  getScenario: (id: number) => api<ScenarioOut>(`/api/v1/scenarios/${id}`),
  createScenario: (payload: ScenarioIn) =>
    api<ScenarioOut>('/api/v1/scenarios', { method: 'POST', body: payload }),
  rerunScenario: (id: number) =>
    api<ScenarioOut>(`/api/v1/scenarios/${id}/run`, { method: 'POST' }),
  duplicateScenario: (id: number) =>
    api<ScenarioOut>(`/api/v1/scenarios/${id}/duplicate`, { method: 'POST' }),
  deleteScenario: (id: number) =>
    api<void>(`/api/v1/scenarios/${id}`, { method: 'DELETE' }),

  compare: (a: number, b: number) =>
    api<{ scenario_a: ScenarioOut; scenario_b: ScenarioOut }>('/api/v1/scenarios/compare', {
      method: 'POST',
      body: { scenario_a_id: a, scenario_b_id: b },
    }),

  methodology: () =>
    api<{
      intro: string;
      sections: { id: string; title: string; summary: string; details: string }[];
      disclaimer: string;
    }>('/api/v1/methodology'),
};
