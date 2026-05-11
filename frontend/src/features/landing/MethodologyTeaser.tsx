import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Eyebrow } from '@/components/layout/Eyebrow';

const ITEMS = [
  { id: 'cagr', label: 'CAGR', body: '((V_end / V_start) ^ (1 / years)) − 1' },
  { id: 'drawdown', label: 'Max drawdown', body: 'Largest peak-to-trough decline' },
  { id: 'volatility', label: 'Volatility', body: 'σ of daily log returns × √252' },
  { id: 'benchmark', label: 'Benchmark', body: 'Same engine, same deposits' },
];

export function MethodologyTeaser() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start">
        <div className="lg:col-span-5">
          <Eyebrow tone="aurum">The math, in plain English</Eyebrow>
          <h2 className="mt-3 font-display text-[32px] sm:text-4xl tracking-tight text-text-primary">
            We show our work.
          </h2>
          <p className="mt-3 text-text-secondary text-[15px] leading-relaxed">
            Every metric in this product comes with a definition, a unit-tested implementation,
            and a link straight from the chart that produced it.
          </p>
          <Link
            to="/methodology"
            className="mt-6 inline-flex items-center gap-2 text-aurum hover:text-white transition-colors text-[14px] cursor-pointer"
          >
            Read the methodology
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ITEMS.map((it) => (
            <Link
              key={it.id}
              to={`/methodology#${it.id}`}
              className="group rounded-md p-5 bg-bg-surface border border-DEFAULT shadow-card hover:border-strong transition-colors duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] uppercase tracking-[0.16em] text-text-muted">
                  {it.label}
                </span>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
              </div>
              <div className="mt-3 font-mono text-[13.5px] text-text-primary">{it.body}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
