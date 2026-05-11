import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { Eyebrow } from '@/components/layout/Eyebrow';
import { TickerChip } from '@/components/form/TickerChip';
import { Sparkline } from '@/components/charts/Sparkline';
import { fadeUp, stagger } from '@/lib/motion/variants';
import { en } from '@/i18n/en';

interface Sample {
  id: string;
  title: string;
  subtitle: string;
  symbols: string[];
  metric: string;
  metricColor: string;
  vs: string;
  spark: number[];
  sparkColor: string;
}

const SAMPLES: Sample[] = [
  {
    id: 'sample-1',
    title: 'AAPL since 2011',
    subtitle: '$10,000 lump sum · Jan 2011 → today',
    symbols: ['AAPL'],
    metric: '+223.3%',
    metricColor: 'text-positive',
    vs: '+139pp vs SPY',
    spark: [100, 110, 124, 132, 145, 162, 180, 192, 215, 230, 252, 280, 305, 322],
    sparkColor: 'var(--brand)',
  },
  {
    id: 'sample-2',
    title: 'DCA $500/mo into SPY',
    subtitle: '11 years of monthly contributions',
    symbols: ['SPY'],
    metric: '+13.4%',
    metricColor: 'text-positive',
    vs: '−24pp vs QQQ',
    spark: [100, 102, 105, 110, 113, 118, 121, 126, 132, 138, 142, 150, 158, 168],
    sparkColor: 'var(--lavender)',
  },
  {
    id: 'sample-3',
    title: 'Mag-Five basket · 2016',
    subtitle: '5 tickers, weighted, vs SPY',
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'],
    metric: '+412%',
    metricColor: 'text-positive',
    vs: '+220pp vs SPY',
    spark: [100, 108, 120, 138, 150, 175, 198, 230, 268, 310, 360, 412, 450, 510],
    sparkColor: 'var(--aurum)',
  },
  {
    id: 'sample-4',
    title: 'NVDA since 2018',
    subtitle: 'Same date, same dollars',
    symbols: ['NVDA', 'MSFT'],
    metric: '+1280%',
    metricColor: 'text-positive',
    vs: 'NVDA wins',
    spark: [100, 120, 145, 180, 230, 280, 360, 450, 590, 720, 880, 1100, 1280, 1380],
    sparkColor: 'var(--positive)',
  },
];

export function SampleScenarios() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16">
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <Eyebrow tone="aurum">{en.landing.samples.title}</Eyebrow>
          <h2 className="mt-3 font-display text-[32px] sm:text-4xl tracking-tight text-text-primary">
            One click into a real story.
          </h2>
          <p className="mt-3 text-text-secondary text-[15px]">{en.landing.samples.subtitle}</p>
        </div>
      </div>

      <motion.div
        variants={stagger(0.07)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {SAMPLES.map((s) => (
          <motion.div key={s.id} variants={fadeUp}>
            <Link
              to={`/results/${s.id}`}
              className="block group rounded-md bg-bg-surface border border-DEFAULT shadow-card overflow-hidden transition-[border-color,transform] duration-200 ease-premium hover:-translate-y-0.5 hover:border-strong cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center -space-x-2">
                    {s.symbols.map((sym, i) => (
                      <TickerChip key={sym} symbol={sym} className={i > 0 ? 'ring-2 ring-bg-surface' : ''} />
                    ))}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                </div>
                <div className="mt-4">
                  <h3 className="text-[15.5px] font-semibold tracking-tight text-text-primary">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-text-muted">{s.subtitle}</p>
                </div>
              </div>
              <div className="px-5">
                <Sparkline values={s.spark} color={s.sparkColor} height={56} />
              </div>
              <div className="px-5 pb-5 pt-2 flex items-center justify-between">
                <span className={`font-mono tabular text-[14px] ${s.metricColor}`}>{s.metric}</span>
                <span className="text-[11.5px] text-text-muted">{s.vs}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
