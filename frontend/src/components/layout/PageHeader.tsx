import type { ReactNode } from 'react';
import { Eyebrow } from './Eyebrow';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, right }: Props) {
  return (
    <header className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-5 sm:pb-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          {eyebrow ? <Eyebrow tone="aurum">{eyebrow}</Eyebrow> : null}
          <h1 className="mt-3 font-display text-[32px] sm:text-4xl md:text-5xl tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-text-secondary max-w-2xl text-[14.5px] sm:text-[15px] leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}
