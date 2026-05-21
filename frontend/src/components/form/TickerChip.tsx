import { classNames } from '@/lib/formatters';

interface Props {
  symbol: string;
  size?: 'sm' | 'md';
  logoUrl?: string | null;
  className?: string;
}

const COLOR_FOR_LETTER: Record<string, string> = {
  A: 'bg-brand/15 text-brand',
  B: 'bg-positive/15 text-positive',
  C: 'bg-aurum/15 text-aurum',
  D: 'bg-caramel/15 text-caramel',
  E: 'bg-info/15 text-info',
  F: 'bg-negative/15 text-negative',
};

function pick(symbol: string): string {
  const k = symbol.charCodeAt(0) % 6;
  return Object.values(COLOR_FOR_LETTER)[k];
}

export function TickerChip({ symbol, size = 'sm', className }: Props) {
  const letters = symbol.slice(0, 2);
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center font-mono font-medium rounded-xs border border-DEFAULT',
        size === 'sm' ? 'w-7 h-7 text-micro' : 'w-9 h-9 text-caption',
        pick(symbol),
        className,
      )}
      aria-hidden
    >
      {letters}
    </span>
  );
}
