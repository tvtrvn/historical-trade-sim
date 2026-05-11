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
import type { TimeseriesPoint } from '@/lib/api/types';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  data: TimeseriesPoint[];
}

export function DrawdownChart({ data }: Props) {
  const chartData = useMemo(
    () => data.map((p) => ({ date: p.date, Drawdown: Number(p.drawdown_pct) })),
    [data],
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="g-dd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--negative)" stopOpacity={0} />
            <stop offset="100%" stopColor="var(--negative)" stopOpacity={0.34} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          width={48}
          domain={['dataMin', 0]}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          content={<ChartTooltip formatter={(n) => `${n.toFixed(2)}%`} />}
        />
        <Area
          type="monotone"
          dataKey="Drawdown"
          stroke="var(--negative)"
          strokeWidth={1.5}
          fill="url(#g-dd)"
          isAnimationActive
          animationDuration={520}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
