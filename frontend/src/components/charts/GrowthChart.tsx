import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
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
  benchmarkLabel: string;
  invested?: boolean; // overlay invested as a thin dashed line
}

export function GrowthChart({ data, benchmarkLabel, invested = true }: Props) {
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        date: p.date,
        Portfolio: Number(p.value),
        [benchmarkLabel]: Number(p.benchmark_value),
        Invested: Number(p.invested),
      })),
    [data, benchmarkLabel],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="g-portfolio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
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
          tickFormatter={(v) => fmt.shortMoney(v)}
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          width={60}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          content={<ChartTooltip formatter={(n) => fmt.moneyPrecise(n)} />}
        />
        <Area
          type="monotone"
          dataKey="Portfolio"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#g-portfolio)"
          activeDot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--bg-canvas)', strokeWidth: 2 }}
          isAnimationActive
          animationDuration={620}
        />
        <Line
          type="monotone"
          dataKey={benchmarkLabel}
          stroke="var(--chart-2)"
          strokeWidth={1.5}
          strokeDasharray="6 6"
          dot={false}
          isAnimationActive
          animationDuration={620}
        />
        {invested ? (
          <Line
            type="stepAfter"
            dataKey="Invested"
            stroke="var(--text-muted)"
            strokeWidth={1}
            strokeDasharray="2 4"
            dot={false}
            isAnimationActive={false}
          />
        ) : null}
        <Legend
          verticalAlign="top"
          height={32}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 4 }}
          formatter={(v) => <span className="text-text-secondary">{String(v)}</span>}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
