import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { LinkButton } from '@/components/buttons/LinkButton';
import { en } from '@/i18n/en';
import { fadeUp, easePremium } from '@/lib/motion/variants';
import { useReducedMotionPref } from '@/lib/hooks/useReducedMotion';
import { ScenarioFloatCard } from './ScenarioFloatCard';

export function Hero() {
  const reduce = useReducedMotionPref();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 90, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-4, 4]), { stiffness: 90, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
      my.set(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onLeave = () => {
      mx.set(0);
      my.set(0);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [reduce, mx, my]);

  return (
    <section className="relative overflow-hidden">
      {/* Flat graphite backdrop + horizon hairline */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 1.2, ease: easePremium }}
        className="pointer-events-none absolute left-0 right-0 top-[68%] h-px bg-hairline"
      />

      <div className="relative max-w-container mx-auto px-4 sm:px-6 pt-28 sm:pt-32 lg:pt-40 pb-16 sm:pb-20 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 items-center">
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-strong bg-bg-surface/60 backdrop-blur-md text-text-secondary text-caption">
              <Sparkles className="w-3.5 h-3.5 text-aurum" />
              <span>{en.landing.eyebrow}</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 font-display tracking-display text-display-m sm:text-display-l md:text-display-l lg:text-display-xl leading-[1.05] text-text-primary"
            >
              See how that decision <em className="italic font-display text-aurum/95">could have</em>
              <br className="hidden sm:block" />
              <span className="sm:inline"> </span>played out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-5 sm:mt-6 max-w-xl text-text-secondary text-body sm:text-body-l leading-[1.65]"
            >
              {en.landing.sub}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-7 sm:mt-9 flex flex-wrap items-center gap-3">
              <LinkButton
                to="/results/sample-1"
                variant="primary"
                size="lg"
                iconRight={<ArrowRight className="w-4 h-4" />}
              >
                {en.cta.primary}
              </LinkButton>
              <LinkButton
                to="/builder"
                variant="secondary"
                size="lg"
                iconRight={<ChevronRight className="w-4 h-4" />}
              >
                {en.cta.secondary}
              </LinkButton>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-7 sm:mt-9 flex flex-wrap items-center gap-x-5 sm:gap-x-6 gap-y-2 text-caption text-text-muted"
            >
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                12 securities seeded
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aurum" />
                2010 → today
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                CAGR · drawdown · volatility
              </span>
            </motion.div>
          </motion.div>

          <div className="lg:col-span-5">
            <motion.div
              ref={ref}
              style={{ rotateX: reduce ? 0 : rx, rotateY: reduce ? 0 : ry, transformPerspective: 1000 }}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: easePremium, delay: 0.1 }}
              className="will-change-transform"
            >
              <ScenarioFloatCard />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
