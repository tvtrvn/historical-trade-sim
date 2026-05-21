import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitCompareArrows } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/layout/Card';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { Select } from '@/components/form/Select';
import { Field } from '@/components/form/Field';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { TickerChip } from '@/components/form/TickerChip';
import { apiEndpoints } from '@/lib/api/endpoints';
import { fmt } from '@/lib/formatters';
import { en } from '@/i18n/en';
import { fadeUp } from '@/lib/motion/variants';

import { ComparedGrowthChart } from './ComparedGrowthChart';

export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const aId = params.get('a');
  const bId = params.get('b');

  const { data: scenarios } = useQuery({
    queryKey: ['scenarios'],
    queryFn: apiEndpoints.listScenarios,
  });

  const aQ = useQuery({
    queryKey: ['scenario', aId],
    queryFn: () => apiEndpoints.getScenario(Number(aId)),
    enabled: !!aId,
  });
  const bQ = useQuery({
    queryKey: ['scenario', bId],
    queryFn: () => apiEndpoints.getScenario(Number(bId)),
    enabled: !!bId,
  });

  const opts = useMemo(
    () =>
      (scenarios ?? []).map((s) => ({ value: String(s.id), label: `${s.name} · vs ${s.benchmark_symbol}` })),
    [scenarios],
  );

  const setSide = (side: 'a' | 'b', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(side, value);
    else next.delete(side);
    setParams(next, { replace: true });
  };

  return (
    <div className="max-w-container mx-auto px-4 sm:px-6">
      <PageHeader
        eyebrow="Side by side"
        title={en.nav.compare}
        subtitle="Pick two saved scenarios to compare them on synchronized charts and KPIs."
      />

      <Card padded>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Scenario A">
            <Select
              value={aId ?? ''}
              onChange={(v) => setSide('a', v)}
              options={[{ value: '', label: 'Pick a scenario' }, ...opts]}
            />
          </Field>
          <Field label="Scenario B">
            <Select
              value={bId ?? ''}
              onChange={(v) => setSide('b', v)}
              options={[{ value: '', label: 'Pick a scenario' }, ...opts]}
            />
          </Field>
        </div>
      </Card>

      <div className="mt-6">
        {!aId || !bId ? (
          <EmptyState
            icon={<GitCompareArrows className="w-5 h-5" />}
            title={en.compare.empty.title}
            body={en.compare.empty.body}
          />
        ) : aQ.isLoading || bQ.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={140} radius="md" />
            ))}
          </div>
        ) : aQ.data && bQ.data && aQ.data.latest_result && bQ.data.latest_result ? (
          <CompareView aData={aQ.data} bData={bQ.data} />
        ) : (
          <Card>
            <div className="text-text-muted">Couldn't load one of the scenarios.</div>
          </Card>
        )}
      </div>
    </div>
  );
}

function CompareView({
  aData,
  bData,
}: {
  aData: NonNullable<ReturnType<typeof apiEndpoints.getScenario> extends Promise<infer T> ? T : never>;
  bData: NonNullable<ReturnType<typeof apiEndpoints.getScenario> extends Promise<infer T> ? T : never>;
}) {
  const a = aData.latest_result!;
  const b = bData.latest_result!;
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-6"
    >
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CompareCard
          tone="brand"
          title={aData.name}
          symbols={aData.positions.map((p) => p.symbol)}
          period={`${fmt.date(aData.start_date)} → ${fmt.date(aData.end_date)}`}
          benchmark={aData.benchmark_symbol}
          finalValue={a.final_value}
          totalReturnPct={a.total_return_pct}
          cagrPct={a.cagr_pct}
          ddPct={a.max_drawdown_pct}
        />
        <CompareCard
          tone="caramel"
          title={bData.name}
          symbols={bData.positions.map((p) => p.symbol)}
          period={`${fmt.date(bData.start_date)} → ${fmt.date(bData.end_date)}`}
          benchmark={bData.benchmark_symbol}
          finalValue={b.final_value}
          totalReturnPct={b.total_return_pct}
          cagrPct={b.cagr_pct}
          ddPct={b.max_drawdown_pct}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <ChartFrame
          eyebrow="Synchronized growth"
          title="Both scenarios, normalized to $1 invested"
          description="Both series are rebased to invested-dollar terms so the lines start together."
          height={420}
        >
          <ComparedGrowthChart aSeries={a.payload.timeseries} bSeries={b.payload.timeseries} aLabel={aData.name} bLabel={bData.name} />
        </ChartFrame>
      </motion.div>
    </motion.div>
  );
}

function CompareCard({
  tone,
  title,
  symbols,
  period,
  benchmark,
  finalValue,
  totalReturnPct,
  cagrPct,
  ddPct,
}: {
  tone: 'brand' | 'caramel';
  title: string;
  symbols: string[];
  period: string;
  benchmark: string;
  finalValue: string;
  totalReturnPct: string;
  cagrPct: string;
  ddPct: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            tone === 'brand' ? 'bg-brand' : 'bg-caramel'
          }`}
        />
        <Eyebrow>{tone === 'brand' ? 'A' : 'B'} · vs {benchmark}</Eyebrow>
      </div>
      <h3 className="mt-2 text-h3 font-semibold tracking-tight text-text-primary">{title}</h3>
      <div className="mt-2 flex items-center -space-x-2">
        {symbols.map((s) => (
          <TickerChip key={s} symbol={s} className="ring-2 ring-bg-surface" />
        ))}
        <span className="ml-3 text-text-muted text-caption">{period}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Mini label="Final value" value={fmt.money(finalValue)} mono />
        <Mini
          label="Total return"
          value={fmt.pct(totalReturnPct, 2)}
          mono
          tone={Number(totalReturnPct) >= 0 ? 'text-positive' : 'text-negative'}
        />
        <Mini label="CAGR" value={fmt.pctRaw(cagrPct, 2)} mono tone="text-aurum" />
        <Mini label="Max drawdown" value={`-${Number(ddPct).toFixed(2)}%`} mono tone="text-negative" />
      </div>
    </Card>
  );
}

function Mini({
  label,
  value,
  tone = 'text-text-primary',
  mono,
}: {
  label: string;
  value: string;
  tone?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-sm bg-bg-surface-2 border border-DEFAULT p-3">
      <div className="text-micro uppercase tracking-eyebrow text-text-muted">{label}</div>
      <div className={`mt-1 ${mono ? 'font-mono tabular' : ''} text-body ${tone}`}>{value}</div>
    </div>
  );
}
