import type { TooltipProps } from 'recharts';
import { fmt } from '@/lib/formatters';

type Props = TooltipProps<number, string> & {
  formatter?: (value: number, name: string) => string;
  showDate?: boolean;
};

export function ChartTooltip({ active, payload, label, formatter, showDate = true }: Props) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-strong bg-bg-elevated/95 backdrop-blur-md shadow-card px-3 py-2 min-w-[180px]">
      {showDate && label ? (
        <div className="text-micro text-text-muted uppercase tracking-wider mb-1.5">
          {fmt.date(String(label), 'long')}
        </div>
      ) : null}
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey?.toString() ?? p.name} className="flex items-center justify-between gap-3 text-body-s">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-text-secondary">{p.name}</span>
            </div>
            <span className="font-mono tabular text-text-primary">
              {formatter && p.value !== undefined ? formatter(Number(p.value), String(p.name)) : fmt.money(Number(p.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
