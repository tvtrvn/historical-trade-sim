import { motion } from 'framer-motion';
import { Layers, LineChart, ScaleIcon, Sparkles, BookOpen } from 'lucide-react';

import { Eyebrow } from '@/components/layout/Eyebrow';
import { en } from '@/i18n/en';
import { stagger, fadeUp } from '@/lib/motion/variants';

const ICONS = [Sparkles, Layers, ScaleIcon, LineChart, BookOpen];

export function ValueProps() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <div className="max-w-3xl mb-10 sm:mb-12">
        <Eyebrow tone="aurum">What's in the box</Eyebrow>
        <h2 className="mt-3 font-display text-[32px] sm:text-4xl tracking-tight text-text-primary">
          Built for stories, not toy calculators.
        </h2>
        <p className="mt-3 text-text-secondary text-[15px] sm:text-[15.5px] leading-relaxed">
          Every metric is unit-tested, every chart links to a definition, and every result
          carries the date it was computed on.
        </p>
      </div>

      <motion.div
        variants={stagger(0.07)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4"
      >
        {/* Bento layout: 1 large + 4 medium */}
        {en.landing.valueProps.map((vp, i) => {
          const Icon = ICONS[i] ?? Sparkles;
          const span =
            i === 0
              ? 'lg:col-span-7 lg:row-span-2 min-h-[260px]'
              : i === 1
              ? 'lg:col-span-5'
              : 'lg:col-span-4';
          const premium = i === 0;
          return (
            <motion.div
              key={vp.title}
              variants={fadeUp}
              className={`relative rounded-md bg-bg-surface border border-DEFAULT shadow-card p-6 ${
                premium ? 'gradient-border' : ''
              } ${span} transition-[border-color,transform] duration-200 ease-premium hover:-translate-y-0.5 hover:border-strong`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-sm grid place-items-center border border-DEFAULT ${
                    premium ? 'bg-aurum/10 text-aurum' : 'bg-bg-surface-2 text-text-secondary'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-semibold tracking-tight text-text-primary">
                    {vp.title}
                  </h3>
                  <p className="mt-2 text-text-secondary text-[14px] leading-relaxed">{vp.body}</p>
                </div>
              </div>
              {premium ? <PremiumDecor /> : null}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

function PremiumDecor() {
  return (
    <svg
      aria-hidden
      className="absolute right-0 bottom-0 w-72 h-44 pointer-events-none opacity-50"
      viewBox="0 0 320 200"
      fill="none"
    >
      <defs>
        <linearGradient id="pd" x1="0" y1="0" x2="320" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--aurum)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M0 160 C 60 130, 100 150, 140 110 S 220 80, 260 60 S 310 30, 320 20"
        stroke="url(#pd)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M0 180 C 60 170, 110 175, 160 150 S 240 130, 280 115 S 310 95, 320 90"
        stroke="url(#pd)"
        strokeWidth="1"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
