import type { ReactNode } from 'react';
import { Eyebrow } from './Eyebrow';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}

export function SectionHeader({ eyebrow, title, subtitle, right }: Props) {
  return (
    <div className="flex items-end justify-between gap-6 mb-6">
      <div>
        {eyebrow ? <Eyebrow tone="aurum">{eyebrow}</Eyebrow> : null}
        <h2 className="mt-2 font-display text-3xl tracking-tight text-text-primary">{title}</h2>
        {subtitle ? <p className="mt-2 text-text-secondary max-w-2xl">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
