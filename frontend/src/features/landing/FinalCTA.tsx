import { ArrowRight } from 'lucide-react';

import { LinkButton } from '@/components/buttons/LinkButton';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { en } from '@/i18n/en';

export function FinalCTA() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-12 pb-20 sm:pb-24">
      <div className="relative overflow-hidden rounded-lg gradient-border bg-bg-surface p-7 sm:p-10 lg:p-16">
        <div aria-hidden className="absolute inset-0 bg-aurora opacity-70 pointer-events-none" />
        <div className="relative">
          <Eyebrow tone="aurum">Ready when you are</Eyebrow>
          <h2 className="mt-3 font-display text-[30px] sm:text-4xl lg:text-5xl tracking-tight text-text-primary max-w-xl leading-[1.08]">
            Pick a ticker. Pick a date. Watch the math unfold.
          </h2>
          <p className="mt-4 text-text-secondary max-w-xl text-[14.5px] sm:text-[15.5px] leading-relaxed">
            Build a scenario in under a minute. Compare it against SPY by default. Save it to
            your library. Compare two saved scenarios side-by-side.
          </p>
          <div className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3">
            <LinkButton to="/builder" variant="primary" size="lg" iconRight={<ArrowRight className="w-4 h-4" />}>
              {en.cta.runSimulation}
            </LinkButton>
            <LinkButton to="/methodology" variant="ghost" size="lg">
              Read the methodology
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}
