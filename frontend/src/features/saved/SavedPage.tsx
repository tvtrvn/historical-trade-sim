import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Plus, Trash2, Copy as CopyIcon, ArrowRight } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { LinkButton } from '@/components/buttons/LinkButton';
import { Button } from '@/components/buttons/Button';
import { TickerChip } from '@/components/form/TickerChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { apiEndpoints } from '@/lib/api/endpoints';
import { fmt } from '@/lib/formatters';
import { en } from '@/i18n/en';
import { stagger, fadeUp } from '@/lib/motion/variants';

export function SavedPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scenarios'],
    queryFn: apiEndpoints.listScenarios,
  });

  const dup = useMutation({
    mutationFn: (id: number) => apiEndpoints.duplicateScenario(id),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['scenarios'] });
      navigate(`/results/${s.id}`);
    },
  });
  const del = useMutation({
    mutationFn: (id: number) => apiEndpoints.deleteScenario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });

  return (
    <div>
      <div className="max-w-container mx-auto px-4 sm:px-6">
        <PageHeader
          eyebrow="Library"
          title="Saved scenarios"
          subtitle="Every scenario you save lives here. Re-run, duplicate to A/B-test, or pair two for a comparison."
          right={
            <LinkButton to="/builder" variant="primary" size="md" iconLeft={<Plus className="w-4 h-4" />}>
              New scenario
            </LinkButton>
          }
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={220} radius="md" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Compass className="w-5 h-5" />}
              title={en.saved.empty.title}
              body={en.saved.empty.body}
              action={
                <LinkButton to="/builder" variant="primary" iconRight={<ArrowRight className="w-4 h-4" />}>
                  Build your first scenario
                </LinkButton>
              }
            />
          </div>
        ) : (
          <motion.div
            variants={stagger(0.06)}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2"
          >
            {data.map((s) => {
              const ret = s.latest_summary ? Number(s.latest_summary.total_return_pct) : 0;
              return (
                <motion.div key={s.id} variants={fadeUp}>
                  <div className="group rounded-md bg-bg-surface border border-DEFAULT shadow-card overflow-hidden transition-[border-color,transform] duration-200 ease-premium hover:-translate-y-0.5 hover:border-strong">
                    <Link to={`/results/${s.id}`} className="block p-5 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <Eyebrow>
                          {s.mode} · vs {s.benchmark_symbol}
                        </Eyebrow>
                        <span className="text-micro text-text-muted">
                          {fmt.date(s.created_at)}
                        </span>
                      </div>
                      <h3 className="mt-2 text-body font-semibold tracking-tight text-text-primary line-clamp-2">
                        {s.name}
                      </h3>
                      <div className="mt-2 flex items-center -space-x-2">
                        {s.positions.map((p) => (
                          <TickerChip
                            key={p.symbol}
                            symbol={p.symbol}
                            className="ring-2 ring-bg-surface"
                          />
                        ))}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-sm bg-bg-surface-2 border border-DEFAULT p-2.5">
                          <div className="text-micro uppercase tracking-eyebrow text-text-muted">
                            Final
                          </div>
                          <div className="mt-1 font-mono tabular text-body-s text-text-primary">
                            {s.latest_summary
                              ? fmt.shortMoney(s.latest_summary.final_value)
                              : '—'}
                          </div>
                        </div>
                        <div className="rounded-sm bg-bg-surface-2 border border-DEFAULT p-2.5">
                          <div className="text-micro uppercase tracking-eyebrow text-text-muted">
                            Return
                          </div>
                          <div
                            className={`mt-1 font-mono tabular text-body-s ${
                              ret >= 0 ? 'text-positive' : 'text-negative'
                            }`}
                          >
                            {s.latest_summary ? fmt.pct(ret, 1) : '—'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-caption text-text-muted">
                        {fmt.date(s.start_date)} → {fmt.date(s.end_date)}
                      </div>
                    </Link>
                    <div className="border-t border-DEFAULT px-3 py-2 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/compare?a=${s.id}`)}
                      >
                        Compare
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={<CopyIcon className="w-3.5 h-3.5" />}
                        onClick={() => dup.mutate(s.id)}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => del.mutate(s.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
