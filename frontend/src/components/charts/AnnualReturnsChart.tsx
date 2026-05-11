import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnnualMetric } from '@/lib/api/types';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  metrics: AnnualMetric[];
}

export function AnnualReturnsChart({ metrics }: Props) {
  const data = useMemo(
    () =>
      metrics.map((m) => ({
        year: String(m.year),
        Portfolio: Number(m.portfolio_return_pct),
        Benchmark: Number(m.benchmark_return_pct),
      })),
    [metrics],
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="year"
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
        />
        <YAxis
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          width={48}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.06)' }}
          content={<ChartTooltip showDate={false} formatter={(n) => `${n.toFixed(2)}%`} />}
        />
        <Bar dataKey="Portfolio" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.Portfolio >= 0 ? 'var(--positive)' : 'var(--negative)'} />
          ))}
        </Bar>
        <Bar dataKey="Benchmark" radius={[4, 4, 0, 0]} maxBarSize={28} fill="var(--lavender)" opacity={0.55} />
      </BarChart>
    </ResponsiveContainer>
  );
}
