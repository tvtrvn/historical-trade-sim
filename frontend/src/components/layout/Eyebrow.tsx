import type { ReactNode } from 'react';
import { classNames } from '@/lib/formatters';

interface Props {
  children: ReactNode;
  className?: string;
  tone?: 'muted' | 'aurum' | 'brand';
}

const TONE = {
  muted: 'text-text-muted',
  aurum: 'text-aurum',
  brand: 'text-brand',
};

export function Eyebrow({ children, className, tone = 'muted' }: Props) {
  return (
    <span
      className={classNames(
        'inline-block text-[11px] font-medium uppercase tracking-[0.18em]',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
