import { motion } from 'framer-motion';
import { BookOpen, Lightbulb } from 'lucide-react';

import { Eyebrow } from '@/components/layout/Eyebrow';
import { en } from '@/i18n/en';
import { fadeUp, stagger } from '@/lib/motion/variants';

export function PlainEnglishExplainer() {
  return (
    <section className="relative">
      {/* Soft horizon hairline */}
      <div className="absolute left-0 right-0 top-0 h-px bg-hairline" aria-hidden />
      <div className="max-w-container mx-auto px-4 sm:px-6 py-16 sm:py-20">
        {/* "What is this?" callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="rounded-md bg-bg-surface border border-DEFAULT shadow-card p-6 sm:p-8 gradient-border"
        >
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="w-11 h-11 rounded-sm bg-aurum/10 text-aurum border border-DEFAULT grid place-items-center shrink-0">
              <Lightbulb className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <Eyebrow tone="aurum">{en.landing.plain.eyebrow}</Eyebrow>
              <h2 className="mt-2 font-display text-h3 sm:text-h2 tracking-tight text-text-primary leading-[1.18]">
                {en.landing.plain.title}
              </h2>
              <p className="mt-3 text-text-secondary text-body leading-relaxed max-w-2xl">
                {en.landing.plain.body}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Glossary cards */}
        <div className="mt-12 sm:mt-16 max-w-3xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-aurum" strokeWidth={1.6} />
            <Eyebrow tone="aurum">{en.landing.glossary.eyebrow}</Eyebrow>
          </div>
          <h3 className="mt-3 font-display text-h2 sm:text-h2 tracking-tight text-text-primary">
            {en.landing.glossary.title}
          </h3>
          <p className="mt-2 text-text-secondary text-body leading-relaxed">
            {en.landing.glossary.sub}
          </p>
        </div>

        <motion.div
          variants={stagger(0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
        >
          {en.landing.glossary.terms.map((t) => (
            <motion.article
              key={t.term}
              variants={fadeUp}
              className="rounded-md bg-bg-surface border border-DEFAULT shadow-card p-5 sm:p-6 transition-[border-color] duration-200 hover:border-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-body font-semibold tracking-tight text-text-primary">
                  {t.term}
                </h4>
              </div>
              <p className="mt-2 text-text-secondary text-body leading-relaxed">{t.plain}</p>
              <div className="mt-3 pt-3 border-t border-DEFAULT flex items-start gap-2 text-body-s text-text-muted leading-relaxed">
                <span className="text-aurum font-medium uppercase tracking-eyebrow text-micro mt-[2px]">
                  Why
                </span>
                <span>{t.why}</span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
