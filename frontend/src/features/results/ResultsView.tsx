import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ChartFrame } from '@/components/charts/ChartFrame';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { DrawdownChart } from '@/components/charts/DrawdownChart';
import { AnnualReturnsChart } from '@/components/charts/AnnualReturnsChart';
import { BasketContributionChart } from '@/components/charts/BasketContributionChart';
import { KpiCard } from '@/components/kpi/KpiCard';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { Card } from '@/components/layout/Card';
import { en } from '@/i18n/en';
import { fmt } from '@/lib/formatters';
import { fadeUp, stagger } from '@/lib/motion/variants';
import type { ScenarioOut } from '@/lib/api/types';

import { ResultsTitleStrip } from './ResultsTitleStrip';
import { TradeLedgerTable } from './TradeLedgerTable';
import { BasketBreakdown } from './BasketBreakdown';

interface Props {
  scenario: ScenarioOut;
  isSample: boolean;
}

const X = en.results.explain;

export function ResultsView({ scenario, isSample }: Props) {
  const r = scenario.latest_result!;
  const ts = r.payload.timeseries;
  const isBasket = scenario.mode === 'basket';
  const benchSymbol = scenario.benchmark_symbol;

  const final = Number(r.final_value);
  const totalReturn = Number(r.total_return_pct);
  const dollarDelta = final - Number(r.invested_total);
  const cagr = Number(r.cagr_pct);
  const benchCagr = Number(r.benchmark_cagr_pct);
  const rel = Number(r.relative_return_pct);
  const vol = Number(r.volatility_pct);
  const dd = Number(r.max_drawdown_pct);
  const sharpe = Number(r.sharpe_like);

  const troughDate = useMemo(() => {
    if (!ts.length) return '';
    let worst = 0;
    let idx = 0;
    ts.forEach((p, i) => {
      const d = Number(p.drawdown_pct);
      if (d < worst) {
        worst = d;
        idx = i;
      }
    });
    return ts[idx]?.date ?? '';
  }, [ts]);

  const annualOnly = useMemo(
    () =>
      r.annual_metrics.filter(
        (m) => Number(m.portfolio_return_pct) !== 0 || Number(m.benchmark_return_pct) !== 0,
      ),
    [r.annual_metrics],
  );

  return (
    <div>
      <ResultsTitleStrip scenario={scenario} isSample={isSample} />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-10">
        {/* Plain-English “how to read this page” callout */}
        <Card padded variant="glass" className="mt-4 sm:mt-6">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-sm bg-aurum/10 text-aurum border border-DEFAULT grid place-items-center shrink-0">
              <Compass className="w-4 h-4" strokeWidth={1.6} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-[17px] sm:text-[19px] tracking-tight text-text-primary">
                {en.results.explainerCallout.title}
              </h2>
              <p className="mt-1.5 text-text-secondary text-[14px] leading-relaxed">
                {en.results.explainerCallout.body}
              </p>
            </div>
          </div>
        </Card>

        <Eyebrow tone="aurum" className="mt-6 sm:mt-8 block">
          {en.results.eyebrowKpi}
        </Eyebrow>

        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          animate="visible"
          className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KpiCard
            eyebrow="Final value"
            value={final}
            format={(n) => fmt.money(n)}
            asOf={fmt.date(scenario.end_date)}
            premium
            size="lg"
            footnote={`${fmt.delta(dollarDelta)} from $${Number(r.invested_total).toLocaleString('en-US')} invested`}
            explain={X.finalValue}
          />
          <KpiCard
            eyebrow="Total return"
            value={totalReturn}
            format={(n) => fmt.pct(n, 2)}
            asOf={fmt.date(scenario.end_date)}
            size="lg"
            delta={{ value: dollarDelta, format: (n) => fmt.delta(n) }}
            explain={X.totalReturn}
          />
          <KpiCard
            eyebrow="CAGR"
            value={cagr}
            format={(n) => fmt.pctRaw(n, 2)}
            asOf={fmt.date(scenario.end_date)}
            size="lg"
            delta={{ value: cagr - benchCagr, format: (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}pp` }}
            footnote={`Benchmark CAGR: ${fmt.pctRaw(benchCagr, 2)}`}
            explain={X.cagr}
          />
          <KpiCard
            eyebrow={`vs ${benchSymbol}`}
            value={rel}
            format={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}pp`}
            asOf={fmt.date(scenario.end_date)}
            size="lg"
            delta={{
              value: rel,
              format: (n) => `${n >= 0 ? 'outperforms' : 'underperforms'}`,
            }}
            explain={X.vsBenchmark}
          />
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="mt-8"
        >
          <ChartFrame
            eyebrow={en.results.eyebrowGrowth}
            title="Portfolio value vs benchmark"
            description={
              <>
                Both series use adjusted-close prices and the same deposit schedule.{' '}
                <Link to="/methodology#benchmark" className="text-aurum hover:text-white transition-colors">
                  How the benchmark is computed →
                </Link>
              </>
            }
            height={420}
            explain={X.growthChart}
          >
            <GrowthChart data={ts} benchmarkLabel={benchSymbol} invested={Number(r.invested_total) > 0} />
          </ChartFrame>
        </motion.div>

        <Eyebrow tone="aurum" className="mt-12 block">
          {en.results.eyebrowSecondary}
        </Eyebrow>
        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KpiCard
            eyebrow="Volatility (annualized)"
            value={vol}
            format={(n) => `${n.toFixed(2)}%`}
            asOf={fmt.date(scenario.end_date)}
            footnote="σ of daily log returns × √252"
            explain={X.volatility}
          />
          <KpiCard
            eyebrow="Max drawdown"
            value={-dd}
            format={(n) => `${n.toFixed(2)}%`}
            asOf={fmt.date(scenario.end_date)}
            footnote={troughDate ? `Trough: ${fmt.date(troughDate)}` : undefined}
            explain={X.maxDrawdown}
          />
          <KpiCard
            eyebrow="Sharpe-like (rf = 0)"
            value={sharpe}
            format={(n) => n.toFixed(2)}
            asOf={fmt.date(scenario.end_date)}
            footnote="CAGR ÷ Volatility"
            explain={X.sharpe}
          />
          <KpiCard
            eyebrow="Run latency"
            value={r.run_ms}
            format={(n) => `${Math.round(n)} ms`}
            asOf={fmt.date(r.run_at)}
            footnote={`${ts.length} datapoints`}
            explain={X.latency}
          />
        </motion.div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartFrame
            eyebrow={en.results.eyebrowDrawdown}
            title="Drawdown curve"
            description="Distance from running peak. Closer to zero is better."
            height={300}
            explain={X.drawdownChart}
          >
            <DrawdownChart data={ts} />
          </ChartFrame>
          <ChartFrame
            eyebrow={en.results.eyebrowAnnual}
            title="Annual returns"
            description={`Portfolio (color-coded) vs ${benchSymbol} (lavender).`}
            height={300}
            explain={X.annualChart}
          >
            <AnnualReturnsChart metrics={annualOnly} />
          </ChartFrame>
        </div>

        {isBasket ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <ChartFrame
                eyebrow={en.results.eyebrowBasket}
                title="Contribution by position"
                description="Final-share-weighted approximation of how each leg drove the total value."
                height={340}
                explain={X.basketChart}
              >
                <BasketContributionChart timeseries={ts} contributions={r.payload.contributions} />
              </ChartFrame>
            </div>
            <div className="lg:col-span-5">
              <BasketBreakdown contributions={r.payload.contributions} />
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <Eyebrow tone="aurum">{en.results.eyebrowLedger}</Eyebrow>
          <h3 className="mt-2 font-display text-2xl tracking-tight text-text-primary">
            Trade ledger
          </h3>
          <p className="mt-1 text-text-secondary text-[14px]">
            Every buy event the engine executed — including each recurring contribution.
          </p>
          <div className="mt-4">
            <TradeLedgerTable trades={r.payload.trades} />
          </div>
        </div>

        <div className="mt-12 mb-2 rounded-md bg-bg-surface-2 border border-DEFAULT p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-[12.5px] text-text-muted">
            {en.disclaimer} Math reference and full definitions live on the methodology page.
          </div>
          <Link
            to="/methodology"
            className="inline-flex items-center gap-1.5 text-aurum hover:text-white transition-colors text-[13px] cursor-pointer"
          >
            Open methodology
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
