import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { InfoBadge } from '@/components/feedback/InfoBadge';
import { classNames } from '@/lib/formatters';
import { AnimatedNumber } from './AnimatedNumber';
import { DeltaChip } from './DeltaChip';
import { fadeUp } from '@/lib/motion/variants';

interface Props {
  eyebrow: string;
  value: number;
  format: (n: number) => string;
  delta?: { value: number; format: (n: number) => string; invert?: boolean };
  asOf?: string;
  size?: 'lg' | 'md';
  premium?: boolean;
  footnote?: ReactNode;
  trail?: ReactNode;
  className?: string;
  explain?: { what: string; read?: string };
}

export function KpiCard({
  eyebrow,
  value,
  format,
  delta,
  asOf,
  size = 'md',
  premium = false,
  footnote,
  trail,
  className,
  explain,
}: Props) {
  return (
    <motion.div
      variants={fadeUp}
      className={classNames(
        'rounded-md p-5 bg-bg-surface border border-DEFAULT shadow-card relative overflow-hidden',
        'transition-[transform,border-color] duration-200 ease-premium hover:-translate-y-0.5 hover:border-strong',
        premium && 'gradient-border',
        className,
      )}
    >
      <div className="inline-flex items-center gap-1.5">
        <Eyebrow tone={premium ? 'aurum' : 'muted'}>{eyebrow}</Eyebrow>
        {explain ? <InfoBadge what={explain.what} read={explain.read} label={`Explain ${eyebrow}`} /> : null}
      </div>
      <div
        className={classNames(
          'mt-3 font-mono tabular tracking-tight text-text-primary',
          size === 'lg' ? 'text-kpi sm:text-kpi-xl leading-[44px] font-medium' : 'text-kpi sm:text-kpi font-medium',
        )}
      >
        <AnimatedNumber value={value} format={format} />
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {delta ? (
          <DeltaChip value={delta.value} format={delta.format} invert={delta.invert} />
        ) : null}
        {asOf ? (
          <span className="text-micro text-text-muted">as of {asOf}</span>
        ) : null}
      </div>
      {footnote ? <div className="mt-2 text-caption text-text-muted">{footnote}</div> : null}
      {trail ? <div className="absolute bottom-0 left-0 right-0 h-10">{trail}</div> : null}
    </motion.div>
  );
}
