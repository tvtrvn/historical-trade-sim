import { motion } from 'framer-motion';

import { Eyebrow } from '@/components/layout/Eyebrow';
import { TickerChip } from '@/components/form/TickerChip';
import { AnimatedNumber } from '@/components/kpi/AnimatedNumber';
import { DeltaChip } from '@/components/kpi/DeltaChip';
import { Sparkline } from '@/components/charts/Sparkline';
import { fmt } from '@/lib/formatters';

const SAMPLE_SPARK = [
  100, 102, 99, 104, 110, 108, 112, 118, 116, 122, 130, 128, 135, 140, 138, 152,
  148, 155, 162, 158, 168, 175, 172, 184, 196, 192, 205, 218, 232, 248, 240,
  258, 272, 290, 285, 308, 322, 314,
];

export function ScenarioFloatCard() {
  return (
    <div className="relative">
      <div className="relative gradient-border bg-bg-surface rounded-lg p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TickerChip symbol="AAPL" size="md" />
            <div>
              <div className="text-body-s text-text-secondary">Apple Inc.</div>
              <div className="font-mono text-caption text-text-muted">NASDAQ · AAPL</div>
            </div>
          </div>
          <Eyebrow tone="aurum">Sample · vs SPY</Eyebrow>
        </div>

        <div className="mt-6">
          <div className="text-caption text-text-muted">Final value · Apr 2026</div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono tabular text-text-primary text-kpi-xl font-medium tracking-tight">
              <AnimatedNumber value={32327} format={(n) => fmt.money(n)} />
            </span>
            <DeltaChip value={223.27} format={(n) => fmt.pct(n)} size="md" />
          </div>
          <div className="text-caption text-text-muted mt-1">From $10,000 invested · Jan 3, 2011</div>
        </div>

        <div className="mt-6 -mx-1">
          <Sparkline values={SAMPLE_SPARK} color="var(--brand)" height={70} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Mini label="CAGR" value="7.96%" tone="text-positive" />
          <Mini label="Max drawdown" value="−48.29%" tone="text-negative" />
          <Mini label="Vs SPY" value="+139pp" tone="text-aurum" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-5 pt-4 border-t border-DEFAULT flex items-center justify-between"
        >
          <span className="text-micro uppercase tracking-eyebrow text-text-muted">
            Educational · not advice
          </span>
          <span className="font-mono text-micro text-text-muted">
            holding 15y 3m
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-sm bg-bg-surface-2 border border-DEFAULT p-3">
      <div className="text-micro uppercase tracking-eyebrow text-text-muted">{label}</div>
      <div className={`mt-1 font-mono tabular text-body ${tone}`}>{value}</div>
    </div>
  );
}
