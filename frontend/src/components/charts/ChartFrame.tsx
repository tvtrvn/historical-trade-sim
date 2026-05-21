import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { InfoBadge } from '@/components/feedback/InfoBadge';
import { classNames } from '@/lib/formatters';

interface Props {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  right?: ReactNode;
  height?: number;
  children: ReactNode;
  className?: string;
  explain?: { what: string; read?: string };
}

export function ChartFrame({
  eyebrow,
  title,
  description,
  right,
  height = 360,
  children,
  className,
  explain,
}: Props) {
  return (
    <div
      className={classNames(
        'rounded-md bg-bg-surface border border-DEFAULT shadow-card p-5 sm:p-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          {eyebrow ? <Eyebrow tone="aurum">{eyebrow}</Eyebrow> : null}
          <div className="mt-1.5 flex items-center gap-2">
            <h3 className="text-body-l sm:text-h3 font-semibold tracking-tight text-text-primary">
              {title}
            </h3>
            {explain ? (
              <InfoBadge what={explain.what} read={explain.read} size="md" label={`Explain ${title}`} />
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-body-s text-text-secondary max-w-xl leading-relaxed">{description}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </div>
  );
}
