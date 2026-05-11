import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { fmt } from '@/lib/formatters';
import type { TimeseriesPoint } from '@/lib/api/types';

interface Props {
  aSeries: TimeseriesPoint[];
  bSeries: TimeseriesPoint[];
  aLabel: string;
  bLabel: string;
}

/**
 * Both series are rebased to "$1 invested" so they start on the same y. We
 * then merge by date so each row carries both A and B values where available.
 */
export function ComparedGrowthChart({ aSeries, bSeries, aLabel, bLabel }: Props) {
  const data = useMemo(() => {
    const a0 = Number(aSeries[0]?.invested ?? 1) || 1;
    const b0 = Number(bSeries[0]?.invested ?? 1) || 1;
    const aMap = new Map<string, number>();
    aSeries.forEach((p) => {
      const inv = Math.max(Number(p.invested), a0);
      aMap.set(p.date, Number(p.value) / inv);
    });
    const bMap = new Map<string, number>();
    bSeries.forEach((p) => {
      const inv = Math.max(Number(p.invested), b0);
      bMap.set(p.date, Number(p.value) / inv);
    });
    const allDates = Array.from(new Set([...aMap.keys(), ...bMap.keys()])).sort();
    return allDates.map((d) => ({ date: d, [aLabel]: aMap.get(d), [bLabel]: bMap.get(d) }));
  }, [aSeries, bSeries, aLabel, bLabel]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          tickFormatter={(v) => `${v.toFixed(2)}×`}
          stroke="var(--text-muted)"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          width={56}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          content={<ChartTooltip formatter={(n) => `${n.toFixed(3)}× per $`} />}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 4 }}
          formatter={(v) => <span className="text-text-secondary">{String(v)}</span>}
        />
        <Line
          type="monotone"
          dataKey={aLabel}
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          isAnimationActive
          animationDuration={620}
        />
        <Line
          type="monotone"
          dataKey={bLabel}
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
          isAnimationActive
          animationDuration={620}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
