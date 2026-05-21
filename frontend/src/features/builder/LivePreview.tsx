import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';

import { Card } from '@/components/layout/Card';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { Button } from '@/components/buttons/Button';
import { AnimatedNumber } from '@/components/kpi/AnimatedNumber';
import { DeltaChip } from '@/components/kpi/DeltaChip';
import { Sparkline } from '@/components/charts/Sparkline';
import { ApiClientError } from '@/lib/api/client';
import { apiEndpoints } from '@/lib/api/endpoints';
import { fmt } from '@/lib/formatters';
import { en } from '@/i18n/en';
import { useBuilderStore, builderToScenarioIn } from './builderState';

interface Props {
  errors: string[];
  onRun: () => void;
  running: boolean;
  error: unknown;
}

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function LivePreview({ errors, onRun, running, error }: Props) {
  const state = useBuilderStore();
  const input = useMemo(() => builderToScenarioIn(state), [state]);
  const debouncedInput = useDebounced(input, 350);

  const { data, isFetching, error: previewError } = useQuery({
    queryKey: ['preview', debouncedInput],
    queryFn: () => apiEndpoints.simulate(debouncedInput),
    enabled: errors.length === 0,
    retry: false,
  });

  const apiErr = error instanceof ApiClientError ? error : null;
  const previewApiErr = previewError instanceof ApiClientError ? previewError : null;

  const sparkValues = useMemo(() => {
    if (!data?.payload?.timeseries) return [];
    const ts = data.payload.timeseries;
    if (ts.length < 2) return [];
    const step = Math.max(1, Math.floor(ts.length / 64));
    return ts.filter((_, i) => i % step === 0).map((p) => Number(p.value));
  }, [data]);

  const final = data ? Number(data.final_value) : 0;
  const delta = data ? Number(data.total_return_pct) : 0;
  const cagr = data ? Number(data.cagr_pct) : 0;
  const dd = data ? Number(data.max_drawdown_pct) : 0;
  const rel = data ? Number(data.relative_return_pct) : 0;

  return (
    <Card padded variant="glass" className="overflow-hidden">
      <div className="flex items-center justify-between">
        <Eyebrow tone="aurum">{en.builder.livePreview.title}</Eyebrow>
        {isFetching ? (
          <span className="text-micro text-text-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Computing...
          </span>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div className="mt-6 rounded-sm bg-error/10 border border-error/30 p-4 text-body-s text-text-secondary">
          <div className="font-medium text-error mb-1">Fix to run:</div>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : !data ? (
        <div className="mt-8 text-center text-text-muted text-body-s py-10">
          {en.builder.livePreview.empty}
        </div>
      ) : (
        <>
          <div className="mt-5">
            <div className="text-caption text-text-muted">
              Final value · as of {fmt.date(state.end_date)}
            </div>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <span className="font-mono tabular text-text-primary text-kpi-xl font-medium tracking-tight">
                <AnimatedNumber value={final} format={(n) => fmt.money(n)} />
              </span>
              <DeltaChip value={delta} format={(n) => fmt.pct(n)} size="md" />
            </div>
          </div>

          {sparkValues.length > 1 ? (
            <div className="mt-4 -mx-1">
              <Sparkline values={sparkValues} color="var(--brand)" height={62} />
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Mini label="CAGR" value={fmt.pctRaw(cagr, 2)} tone={cagr >= 0 ? 'text-positive' : 'text-negative'} />
            <Mini label="Max DD" value={`-${dd.toFixed(2)}%`} tone="text-negative" />
            <Mini label={`vs ${state.benchmark_symbol}`} value={`${rel >= 0 ? '+' : ''}${rel.toFixed(1)}pp`} tone={rel >= 0 ? 'text-aurum' : 'text-text-secondary'} />
          </div>

          <div className="mt-5 text-micro text-text-muted">
            {en.builder.livePreview.hint}
          </div>
        </>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button
          variant="primary"
          size="lg"
          iconLeft={<Play className="w-4 h-4" />}
          loading={running}
          disabled={errors.length > 0 || running}
          onClick={onRun}
        >
          {en.cta.seeFullSimulation}
        </Button>
      </div>

      {(apiErr || previewApiErr) && (
        <div className="mt-3 text-caption text-error">
          {(apiErr ?? previewApiErr)?.message}
        </div>
      )}
    </Card>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-sm bg-bg-surface-2 border border-DEFAULT p-3">
      <div className="text-micro uppercase tracking-eyebrow text-text-muted">{label}</div>
      <div className={`mt-1 font-mono tabular text-body-s ${tone}`}>{value}</div>
    </div>
  );
}
