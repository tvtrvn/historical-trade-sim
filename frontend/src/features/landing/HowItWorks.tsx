import { motion } from 'framer-motion';
import { MousePointerClick, CalendarDays, BookOpen } from 'lucide-react';

import { Eyebrow } from '@/components/layout/Eyebrow';
import { en } from '@/i18n/en';
import { fadeUp, stagger } from '@/lib/motion/variants';

const ICONS = [MousePointerClick, CalendarDays, BookOpen];

export function HowItWorks() {
  return (
    <section className="relative max-w-container mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-3xl mb-10 sm:mb-12">
        <Eyebrow tone="aurum">{en.landing.howItWorks.eyebrow}</Eyebrow>
        <h2 className="mt-3 font-display text-h2 sm:text-4xl tracking-tight text-text-primary">
          {en.landing.howItWorks.title}
        </h2>
        <p className="mt-3 text-text-secondary text-body leading-relaxed">
          Built so a curious 12-year-old or a 75-year-old retiree can both make sense of it.
        </p>
      </div>

      <motion.ol
        variants={stagger(0.1)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5"
      >
        {en.landing.howItWorks.steps.map((step, i) => {
          const Icon = ICONS[i] ?? BookOpen;
          return (
            <motion.li
              key={step.title}
              variants={fadeUp}
              className="relative rounded-md bg-bg-surface border border-DEFAULT shadow-card p-6 transition-[border-color,transform] duration-200 ease-premium hover:-translate-y-0.5 hover:border-strong"
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-display-m leading-[1] tracking-tight text-aurum/70 tabular">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="w-10 h-10 rounded-sm grid place-items-center bg-bg-surface-2 border border-DEFAULT text-text-secondary">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="mt-5 text-body-l font-semibold tracking-tight text-text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-text-secondary text-body leading-relaxed">{step.body}</p>
              {i < 2 ? (
                <div className="hidden md:block absolute top-1/2 -right-[10px] w-5 h-px bg-hairline" aria-hidden />
              ) : null}
            </motion.li>
          );
        })}
      </motion.ol>
    </section>
  );
}
