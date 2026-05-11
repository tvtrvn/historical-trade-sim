import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { ErrorState } from '@/components/feedback/ErrorState';
import { ResultsSkeleton } from './ResultsSkeleton';
import { ResultsView } from './ResultsView';
import { apiEndpoints } from '@/lib/api/endpoints';
import { SAMPLE_PRESETS } from '@/features/landing/presets';
import type { ScenarioOut } from '@/lib/api/types';

export function ResultsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const isSample = id.startsWith('sample-');

  const sampleQ = useQuery({
    queryKey: ['sample-result', id],
    queryFn: async (): Promise<ScenarioOut> => {
      const preset = SAMPLE_PRESETS[id];
      if (!preset) throw new Error('Unknown sample');
      const res = await apiEndpoints.simulate({
        name: preset.name,
        mode: preset.mode,
        benchmark_symbol: preset.benchmark_symbol,
        start_date: preset.start_date,
        end_date: preset.end_date,
        initial_amount: preset.initial_amount,
        recurring_amount: preset.recurring_amount,
        recurring_freq: preset.recurring_freq,
        fees_pct: preset.fees_pct,
        dividend_reinvest: preset.dividend_reinvest,
        positions: preset.positions,
      });
      return {
        id: 0,
        name: preset.displayTitle,
        mode: preset.mode,
        benchmark_symbol: preset.benchmark_symbol,
        start_date: preset.start_date,
        end_date: preset.end_date,
        initial_amount: String(preset.initial_amount),
        recurring_amount: String(preset.recurring_amount),
        recurring_freq: preset.recurring_freq,
        fees_pct: String(preset.fees_pct),
        dividend_reinvest: preset.dividend_reinvest,
        created_at: new Date().toISOString(),
        positions: preset.positions.map((p) => ({
          symbol: p.symbol,
          weight_pct: String(p.weight_pct),
        })),
        latest_result: res,
      };
    },
    enabled: isSample,
  });

  const savedQ = useQuery({
    queryKey: ['scenario', id],
    queryFn: () => apiEndpoints.getScenario(Number(id)),
    enabled: !isSample && /^\d+$/.test(id),
  });

  const data = isSample ? sampleQ.data : savedQ.data;
  const error = isSample ? sampleQ.error : savedQ.error;
  const isLoading = isSample ? sampleQ.isLoading : savedQ.isLoading;

  if (isLoading) return <ResultsSkeleton />;
  if (error) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 mt-8">
        <ErrorState error={error} onRetry={() => (isSample ? sampleQ.refetch() : savedQ.refetch())} />
      </div>
    );
  }
  if (!data || !data.latest_result) return <ResultsSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ResultsView scenario={data} isSample={isSample} />
    </motion.div>
  );
}
