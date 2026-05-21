import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { classNames } from '@/lib/formatters';

interface Props {
  value: number;
  format: (n: number) => string;
  size?: 'sm' | 'md';
  invert?: boolean;
}

export function DeltaChip({ value, format, size = 'sm', invert = false }: Props) {
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 font-mono tabular',
        size === 'sm' ? 'text-caption px-2 h-6 rounded-xs' : 'text-body-s px-2.5 h-7 rounded-sm',
        positive && 'text-positive bg-positive/10',
        negative && 'text-negative bg-negative/10',
        !positive && !negative && 'text-text-muted bg-bg-surface-2',
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2} />
      {format(value)}
    </span>
  );
}
