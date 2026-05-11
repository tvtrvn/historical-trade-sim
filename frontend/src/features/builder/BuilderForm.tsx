import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Card } from '@/components/layout/Card';
import { Field } from '@/components/form/Field';
import { Input } from '@/components/form/Input';
import { Select } from '@/components/form/Select';
import { SegmentedControl } from '@/components/form/SegmentedControl';
import { TickerPicker } from '@/components/form/TickerPicker';
import { Toggle } from '@/components/form/Toggle';
import { Button } from '@/components/buttons/Button';
import { TickerChip } from '@/components/form/TickerChip';
import { apiEndpoints } from '@/lib/api/endpoints';
import { classNames, fmt } from '@/lib/formatters';
import { en } from '@/i18n/en';
import { useBuilderStore } from './builderState';

const SECTIONS = ['strategy', 'positions', 'dates', 'investment', 'comparison'] as const;
type SectionKey = (typeof SECTIONS)[number];

const HELP = en.builder.help;

export function BuilderForm() {
  const [open, setOpen] = useState<SectionKey>('strategy');

  return (
    <div className="space-y-3">
      <Section
        sectionKey="strategy"
        index={1}
        title={en.builder.sections.strategy}
        blurb="What you’re modeling — name, single vs. basket, optional recurring buys."
        summary={<StrategySummary />}
        open={open === 'strategy'}
        onToggle={() => setOpen(open === 'strategy' ? 'positions' : 'strategy')}
      >
        <StrategyFields />
      </Section>

      <Section
        sectionKey="positions"
        index={2}
        title={en.builder.sections.positions}
        blurb="Which stock(s) you would have bought, and in what proportion."
        summary={<PositionsSummary />}
        open={open === 'positions'}
        onToggle={() => setOpen(open === 'positions' ? 'dates' : 'positions')}
      >
        <PositionsFields />
      </Section>

      <Section
        sectionKey="dates"
        index={3}
        title={en.builder.sections.dates}
        blurb="The window of history you want to replay."
        summary={<DatesSummary />}
        open={open === 'dates'}
        onToggle={() => setOpen(open === 'dates' ? 'investment' : 'dates')}
      >
        <DatesFields />
      </Section>

      <Section
        sectionKey="investment"
        index={4}
        title={en.builder.sections.investment}
        blurb="How much money goes in, and how dividends/fees are handled."
        summary={<InvestmentSummary />}
        open={open === 'investment'}
        onToggle={() => setOpen(open === 'investment' ? 'comparison' : 'investment')}
      >
        <InvestmentFields />
      </Section>

      <Section
        sectionKey="comparison"
        index={5}
        title={en.builder.sections.comparison}
        blurb="The benchmark you want to compare your scenario against."
        summary={<ComparisonSummary />}
        open={open === 'comparison'}
        onToggle={() => setOpen(open === 'comparison' ? 'strategy' : 'comparison')}
      >
        <ComparisonFields />
      </Section>
    </div>
  );
}

interface SectionProps {
  sectionKey: SectionKey;
  index: number;
  title: string;
  blurb?: string;
  summary: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ index, title, blurb, summary, open, onToggle, children }: SectionProps) {
  return (
    <Card padded={false} className={classNames(open && 'border-strong')}>
      <button
        type="button"
        onClick={onToggle}
        className={classNames(
          'w-full flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3 min-h-16 cursor-pointer',
          'transition-colors duration-200 hover:bg-bg-surface-2/40 text-left',
        )}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <span
            className={classNames(
              'w-7 h-7 rounded-xs grid place-items-center text-[12px] font-mono shrink-0',
              open
                ? 'bg-brand/15 text-brand border border-brand/40'
                : 'bg-bg-surface-2 text-text-muted border border-DEFAULT',
            )}
          >
            {index}
          </span>
          <div className="min-w-0">
            <div className="text-[14.5px] font-medium tracking-tight text-text-primary">{title}</div>
            <div className="text-[12.5px] text-text-muted mt-0.5 truncate">
              {open && blurb ? blurb : summary}
            </div>
          </div>
        </div>
        <ChevronDown
          className={classNames(
            'w-4 h-4 text-text-muted transition-transform duration-200 shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-DEFAULT">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

/* ─────────── Section bodies ─────────── */

function StrategyFields() {
  const { mode, recurring_freq, recurring_amount, name, set } = useBuilderStore();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <Field label="Scenario name" explain={{ what: HELP.name.what, read: HELP.name.affect }}>
        <Input value={name} onChange={(e) => set('name', e.target.value)} placeholder="My scenario" />
      </Field>
      <Field label="Mode" explain={{ what: HELP.mode.what, read: HELP.mode.affect }}>
        <SegmentedControl
          value={mode}
          onChange={(v) => {
            if (v === 'single') {
              const positions = useBuilderStore.getState().positions;
              if (positions.length !== 1) {
                useBuilderStore
                  .getState()
                  .setPositions([{ symbol: positions[0]?.symbol || 'AAPL', weight_pct: 100 }]);
              } else {
                useBuilderStore
                  .getState()
                  .setPositions([{ ...positions[0], weight_pct: 100 }]);
              }
            }
            set('mode', v);
          }}
          items={[
            { value: 'single', label: 'Single position' },
            { value: 'basket', label: 'Basket' },
          ]}
        />
      </Field>
      <Field
        label="Recurring contribution"
        explain={{ what: HELP.recurring.what, read: HELP.recurring.affect }}
      >
        <Select
          value={recurring_freq}
          onChange={(v) => set('recurring_freq', v as 'none' | 'monthly' | 'quarterly')}
          options={[
            { value: 'none', label: 'None — one-time investment' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
          ]}
        />
      </Field>
      {recurring_freq !== 'none' ? (
        <Field
          label="Recurring amount"
          trailing={fmt.shortMoney(recurring_amount)}
          explain={{ what: HELP.recurringAmount.what, read: HELP.recurringAmount.affect }}
        >
          <Input
            type="number"
            min={0}
            step={50}
            prefix="$"
            value={recurring_amount}
            onChange={(e) => set('recurring_amount', Number(e.target.value || 0))}
          />
        </Field>
      ) : null}
    </div>
  );
}

function StrategySummary() {
  const { mode, recurring_freq, recurring_amount, name } = useBuilderStore();
  return (
    <span>
      "{name}" · {mode === 'single' ? 'Single' : 'Basket'}
      {recurring_freq !== 'none' ? ` · ${fmt.shortMoney(recurring_amount)} ${recurring_freq}` : ''}
    </span>
  );
}

function PositionsFields() {
  const { mode, positions, setPositions } = useBuilderStore();

  const addPosition = () => {
    const next = [...positions, { symbol: '', weight_pct: 0 }];
    const w = +(100 / next.length).toFixed(2);
    setPositions(next.map((p) => ({ ...p, weight_pct: w })));
  };
  const removePosition = (i: number) => {
    if (positions.length <= 1) return;
    const remaining = positions.filter((_, j) => j !== i);
    const w = +(100 / remaining.length).toFixed(2);
    setPositions(remaining.map((p) => ({ ...p, weight_pct: w })));
  };
  const setSymbol = (i: number, symbol: string) => {
    const copy = [...positions];
    copy[i] = { ...copy[i], symbol };
    setPositions(copy);
  };
  const setWeight = (i: number, w: number) => {
    const copy = [...positions];
    copy[i] = { ...copy[i], weight_pct: w };
    setPositions(copy);
  };
  const autoBalance = () => {
    const w = +(100 / positions.length).toFixed(2);
    setPositions(positions.map((p) => ({ ...p, weight_pct: w })));
  };

  const totalWeight = positions.reduce((s, p) => s + p.weight_pct, 0);

  return (
    <div className="mt-2 space-y-3">
      {positions.map((p, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 sm:gap-3 items-end">
          <div className={classNames(mode === 'basket' ? 'col-span-12 sm:col-span-7' : 'col-span-12')}>
            <Field
              label={`Position ${i + 1}`}
              explain={i === 0 ? { what: HELP.symbol.what, read: HELP.symbol.affect } : undefined}
            >
              <TickerPicker value={p.symbol} onChange={(sym) => setSymbol(i, sym)} />
            </Field>
          </div>
          {mode === 'basket' ? (
            <>
              <div className="col-span-8 sm:col-span-3">
                <Field
                  label="Weight %"
                  explain={i === 0 ? { what: HELP.weight.what, read: HELP.weight.affect } : undefined}
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                    value={p.weight_pct}
                    onChange={(e) => setWeight(i, Number(e.target.value || 0))}
                  />
                </Field>
              </div>
              <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2">
                {positions.length > 1 ? (
                  <button
                    onClick={() => removePosition(i)}
                    className="h-11 w-11 rounded-sm border border-DEFAULT text-text-muted hover:text-negative hover:border-negative transition-colors duration-200 grid place-items-center cursor-pointer"
                    aria-label="Remove position"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ))}

      {mode === 'basket' ? (
        <>
          <WeightBar positions={positions} />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[12.5px] text-text-muted">
              Total weight:{' '}
              <span className="font-mono text-text-primary tabular">{totalWeight.toFixed(2)}%</span>
              {Math.abs(totalWeight - 100) > 0.01 ? (
                <span className="ml-2 text-negative">must equal 100%</span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={autoBalance}>
                Auto-balance
              </Button>
              {positions.length < 10 ? (
                <Button variant="secondary" size="sm" onClick={addPosition}>
                  Add position
                </Button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function WeightBar({ positions }: { positions: { symbol: string; weight_pct: number }[] }) {
  const COLORS = [
    'var(--chart-1)',
    'var(--chart-3)',
    'var(--chart-2)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--chart-6)',
  ];
  return (
    <div className="rounded-xs overflow-hidden border border-DEFAULT bg-bg-surface-2 h-3 flex">
      {positions.map((p, i) => (
        <div
          key={i}
          style={{ width: `${p.weight_pct}%`, backgroundColor: COLORS[i % COLORS.length], opacity: 0.8 }}
          className="transition-[width] duration-300 ease-premium"
          title={`${p.symbol}: ${p.weight_pct.toFixed(2)}%`}
        />
      ))}
    </div>
  );
}

function PositionsSummary() {
  const { mode, positions } = useBuilderStore();
  if (mode === 'single') return <span>{positions[0]?.symbol || 'no ticker'}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {positions.slice(0, 4).map((p) => (
        <TickerChip key={p.symbol + Math.random()} symbol={p.symbol || '??'} size="sm" />
      ))}
      {positions.length > 4 ? <span>+{positions.length - 4}</span> : null}
    </span>
  );
}

function DatesFields() {
  const { start_date, end_date, set } = useBuilderStore();
  const today = '2026-04-29';
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <Field label="Start date" explain={{ what: HELP.startDate.what, read: HELP.startDate.affect }}>
        <Input
          type="date"
          value={start_date}
          min="2010-01-04"
          max={today}
          onChange={(e) => set('start_date', e.target.value)}
        />
      </Field>
      <Field
        label="End date"
        explain={{ what: HELP.endDate.what, read: HELP.endDate.affect }}
        trailing={
          <button
            onClick={() => set('end_date', today)}
            className="text-aurum hover:text-white transition-colors cursor-pointer"
          >
            Today
          </button>
        }
      >
        <Input
          type="date"
          value={end_date}
          min="2010-01-04"
          max={today}
          onChange={(e) => set('end_date', e.target.value)}
        />
      </Field>
    </div>
  );
}

function DatesSummary() {
  const { start_date, end_date } = useBuilderStore();
  return (
    <span>
      {fmt.monthYear(start_date)} → {fmt.monthYear(end_date)}
    </span>
  );
}

function InvestmentFields() {
  const { initial_amount, fees_pct, dividend_reinvest, set } = useBuilderStore();
  return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Initial investment"
          explain={{ what: HELP.initialAmount.what, read: HELP.initialAmount.affect }}
        >
          <Input
            type="number"
            min={0}
            step={100}
            prefix="$"
            value={initial_amount}
            onChange={(e) => set('initial_amount', Number(e.target.value || 0))}
          />
        </Field>
        <Field
          label="Fees per buy"
          hint="Optional. Deducted from each buy as a flat percent."
          explain={{ what: HELP.fees.what, read: HELP.fees.affect }}
        >
          <Input
            type="number"
            min={0}
            max={5}
            step={0.05}
            suffix="%"
            value={fees_pct}
            onChange={(e) => set('fees_pct', Number(e.target.value || 0))}
          />
        </Field>
      </div>
      <Toggle
        checked={dividend_reinvest}
        onChange={(v) => set('dividend_reinvest', v)}
        label="Reinvest dividends"
        hint={HELP.reinvest.affect}
      />
    </div>
  );
}

function InvestmentSummary() {
  const { initial_amount, fees_pct } = useBuilderStore();
  return (
    <span>
      {fmt.shortMoney(initial_amount)} initial
      {fees_pct > 0 ? ` · ${fees_pct.toFixed(2)}% fees` : ''}
    </span>
  );
}

function ComparisonFields() {
  const { benchmark_symbol, set } = useBuilderStore();
  const { data: benchmarks } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: apiEndpoints.listBenchmarks,
  });
  const opts = (benchmarks ?? []).map((b) => ({ value: b.symbol, label: `${b.symbol} · ${b.name}` }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <Field label="Benchmark" explain={{ what: HELP.benchmark.what, read: HELP.benchmark.affect }}>
        <Select
          value={benchmark_symbol}
          onChange={(v) => set('benchmark_symbol', v)}
          options={opts.length ? opts : [{ value: 'SPY', label: 'SPY · S&P 500' }]}
        />
      </Field>
    </div>
  );
}

function ComparisonSummary() {
  const { benchmark_symbol } = useBuilderStore();
  return <span>vs {benchmark_symbol}</span>;
}
