import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt } from '@/lib/formatters';
import type { TimeseriesPoint, PositionContribution } from '@/lib/api/types';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  timeseries: TimeseriesPoint[];
  contributions: PositionContribution[];
}

const PALETTE = [
  'var(--chart-1)',
  'var(--chart-3)',
  'var(--chart-2)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];

/**
 * Approximation: we don't ship per-leg time series in the payload to keep it
 * lightweight. Instead, we re-stack the total portfolio series proportionally
 * to each position's final contribution share — which is a close visual proxy
 * for the basket evolution and still makes the relative weights obvious.
 */
export function BasketContributionChart({ timeseries, contributions }: Props) {
  const data = useMemo(() => {
    const totalFinal = contributions.reduce((s, c) => s + Number(c.final_value), 0) || 1;
    const shares = contributions.map((c) => ({
      symbol: c.symbol,
      share: Number(c.final_value) / totalFinal,
    }));
    return timeseries.map((p) => {
      const v = Number(p.value);
      const row: Record<string, string | number> = { date: p.date };
      shares.forEach((s) => {
        row[s.symbol] = v * s.share;
      });
      return row;
    });
  }, [timeseries, contributions]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} stackOffset="none">
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => fmt.monthYear(v)}
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          minTickGap={56}
        />
        <YAxis
          tickFormatter={(v) => fmt.shortMoney(v)}
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          width={60}
        />
        <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={<ChartTooltip formatter={(n) => fmt.moneyPrecise(n)} />} />
        {contributions.map((c, i) => (
          <Area
            key={c.symbol}
            type="monotone"
            dataKey={c.symbol}
            stackId="1"
            stroke={PALETTE[i % PALETTE.length]}
            fill={PALETTE[i % PALETTE.length]}
            fillOpacity={0.22}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
