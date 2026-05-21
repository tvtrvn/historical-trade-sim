import type { ReactNode } from 'react';
import { classNames } from '@/lib/formatters';
import { InfoBadge } from '@/components/feedback/InfoBadge';

interface Props {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
  explain?: { what: string; read?: string };
}

export function Field({ label, hint, error, children, className, trailing, explain }: Props) {
  return (
    <label className={classNames('block', className)}>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="inline-flex items-center gap-1.5 text-body-s text-text-secondary tracking-wide">
          {label}
          {explain ? <InfoBadge what={explain.what} read={explain.read} label={`What is ${label}?`} /> : null}
        </span>
        {trailing ? <span className="text-caption text-text-muted">{trailing}</span> : null}
      </div>
      {children}
      {error ? (
        <div className="mt-1.5 text-caption text-error">{error}</div>
      ) : hint ? (
        <div className="mt-1.5 text-caption text-text-muted leading-relaxed">{hint}</div>
      ) : null}
    </label>
  );
}
