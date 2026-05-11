import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/layout/Card';
import { HairlineDivider } from '@/components/layout/HairlineDivider';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { apiEndpoints } from '@/lib/api/endpoints';
import { en } from '@/i18n/en';
import { fadeUp, stagger } from '@/lib/motion/variants';

export function MethodologyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['methodology'],
    queryFn: apiEndpoints.methodology,
  });

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
      <PageHeader
        eyebrow="The math, in plain English"
        title="Methodology"
        subtitle="Every metric comes with a definition, a unit-tested implementation, and a link straight from the chart that produced it."
      />

      {isLoading || !data ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={120} radius="md" />
          ))}
        </div>
      ) : (
        <>
          <Card padded variant="glass" className="mb-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 shrink-0 rounded-sm bg-aurum/10 text-aurum border border-DEFAULT grid place-items-center">
                <BookOpen className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <p className="text-text-secondary text-[15px] leading-relaxed">{data.intro}</p>
            </div>
          </Card>

          {/* Plain-English glossary, surfaced before the formal sections */}
          <section id="glossary" className="mb-12 scroll-mt-28">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-aurum" strokeWidth={1.6} />
              <Eyebrow tone="aurum">Glossary · plain English</Eyebrow>
            </div>
            <h2 className="mt-3 font-display text-[26px] sm:text-[30px] tracking-tight text-text-primary">
              {en.landing.glossary.title}
            </h2>
            <p className="mt-2 text-text-secondary text-[14.5px] leading-relaxed max-w-2xl">
              Each term below also appears as a tooltip on the actual metric in the results page.
            </p>
            <motion.div
              variants={stagger(0.04)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
            >
              {en.landing.glossary.terms.map((t) => (
                <motion.div
                  key={t.term}
                  variants={fadeUp}
                  className="rounded-md bg-bg-surface border border-DEFAULT shadow-card p-5 transition-[border-color] duration-200 hover:border-strong"
                >
                  <h3 className="text-[15.5px] font-semibold tracking-tight text-text-primary">
                    {t.term}
                  </h3>
                  <p className="mt-2 text-text-secondary text-[13.5px] leading-relaxed">{t.plain}</p>
                  <div className="mt-3 pt-3 border-t border-DEFAULT flex items-start gap-2 text-[12px] text-text-muted leading-relaxed">
                    <span className="text-aurum font-medium uppercase tracking-[0.14em] text-[10px] mt-[2px]">
                      Why
                    </span>
                    <span>{t.why}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger(0.05)}
            className="grid grid-cols-1 lg:grid-cols-12 gap-4"
          >
            <div className="lg:col-span-3">
              <div className="sticky top-24">
                <Eyebrow>Sections</Eyebrow>
                <ul className="mt-3 space-y-1.5">
                  {data.sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="block text-[13.5px] text-text-secondary hover:text-text-primary transition-colors py-1 cursor-pointer"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-9 space-y-4">
              {data.sections.map((s) => (
                <motion.section
                  key={s.id}
                  id={s.id}
                  variants={fadeUp}
                  className="rounded-md bg-bg-surface border border-DEFAULT shadow-card p-7 scroll-mt-28"
                >
                  <Eyebrow tone="aurum">{s.id}</Eyebrow>
                  <h2 className="mt-2 font-display text-2xl tracking-tight text-text-primary">
                    {s.title}
                  </h2>
                  <p className="mt-3 font-mono text-[14px] text-text-primary bg-bg-surface-2 border border-DEFAULT rounded-sm px-3 py-2 inline-block">
                    {s.summary}
                  </p>
                  <p className="mt-4 text-text-secondary text-[15px] leading-relaxed">{s.details}</p>
                </motion.section>
              ))}
            </div>
          </motion.div>

          <HairlineDivider className="mt-12 mb-6" />
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="text-[12.5px] text-text-muted">{data.disclaimer}</div>
            <Link
              to="/builder"
              className="inline-flex items-center gap-2 text-aurum hover:text-white transition-colors text-[14px] cursor-pointer"
            >
              Build a scenario
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
