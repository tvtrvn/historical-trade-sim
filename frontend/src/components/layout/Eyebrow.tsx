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
        'inline-block text-micro font-medium uppercase tracking-eyebrow',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
