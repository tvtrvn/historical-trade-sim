import { Card } from '@/components/layout/Card';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { TickerChip } from '@/components/form/TickerChip';
import { fmt } from '@/lib/formatters';
import type { PositionContribution } from '@/lib/api/types';

const COLORS = [
  'var(--chart-1)',
  'var(--chart-3)',
  'var(--chart-2)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];

export function BasketBreakdown({ contributions }: { contributions: PositionContribution[] }) {
  const sorted = [...contributions].sort(
    (a, b) => Number(b.contribution_pct) - Number(a.contribution_pct),
  );
  return (
    <Card padded>
      <Eyebrow tone="aurum">Position breakdown</Eyebrow>
      <h3 className="mt-2 text-[18px] font-semibold tracking-tight text-text-primary mb-4">
        Who drove the result
      </h3>
      <div className="space-y-3">
        {sorted.map((c, i) => (
          <div key={c.symbol} className="rounded-sm bg-bg-surface-2 border border-DEFAULT p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <TickerChip symbol={c.symbol} />
                <div className="min-w-0">
                  <div className="font-mono text-[13.5px] text-text-primary">{c.symbol}</div>
                  <div className="text-[11.5px] text-text-muted">
                    weight {Number(c.weight_pct).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono tabular text-[13.5px] text-text-primary">
                  {fmt.money(c.final_value)}
                </div>
                <div className="text-[11.5px] text-text-muted">
                  invested {fmt.shortMoney(c.invested)}
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-bg-canvas overflow-hidden">
              <div
                className="h-full transition-[width] duration-500 ease-premium"
                style={{
                  width: `${Number(c.contribution_pct)}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                  opacity: 0.85,
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-muted">
              <span>contribution</span>
              <span className="font-mono">{Number(c.contribution_pct).toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
