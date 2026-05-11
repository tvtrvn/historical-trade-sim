import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy as CopyIcon,
  GitCompareArrows,
  MoreHorizontal,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/buttons/Button';
import { Eyebrow } from '@/components/layout/Eyebrow';
import { TickerChip } from '@/components/form/TickerChip';
import { fmt, classNames } from '@/lib/formatters';
import { apiEndpoints } from '@/lib/api/endpoints';
import { en } from '@/i18n/en';
import { useBuilderStore } from '@/features/builder/builderState';
import type { ScenarioOut } from '@/lib/api/types';

interface Props {
  scenario: ScenarioOut;
  isSample: boolean;
}

export function ResultsTitleStrip({ scenario, isSample }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const loadFromInput = useBuilderStore((s) => s.loadFromInput);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const rerun = useMutation({
    mutationFn: () => apiEndpoints.rerunScenario(scenario.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenario', String(scenario.id)] }),
  });
  const dup = useMutation({
    mutationFn: () => apiEndpoints.duplicateScenario(scenario.id),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['scenarios'] });
      navigate(`/results/${s.id}`);
    },
  });
  const del = useMutation({
    mutationFn: () => apiEndpoints.deleteScenario(scenario.id),
    onSuccess: () => navigate('/scenarios'),
  });
  const saveSample = useMutation({
    mutationFn: () =>
      apiEndpoints.createScenario({
        name: scenario.name,
        mode: scenario.mode,
        benchmark_symbol: scenario.benchmark_symbol,
        start_date: scenario.start_date,
        end_date: scenario.end_date,
        initial_amount: scenario.initial_amount,
        recurring_amount: scenario.recurring_amount,
        recurring_freq: scenario.recurring_freq,
        fees_pct: scenario.fees_pct,
        dividend_reinvest: scenario.dividend_reinvest,
        positions: scenario.positions.map((p) => ({
          symbol: p.symbol,
          weight_pct: Number(p.weight_pct),
        })),
      }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['scenarios'] });
      navigate(`/results/${s.id}`);
    },
  });

  const goEdit = () => {
    loadFromInput({
      name: scenario.name,
      mode: scenario.mode,
      benchmark_symbol: scenario.benchmark_symbol,
      start_date: scenario.start_date,
      end_date: scenario.end_date,
      initial_amount: scenario.initial_amount,
      recurring_amount: scenario.recurring_amount,
      recurring_freq: scenario.recurring_freq,
      fees_pct: scenario.fees_pct,
      dividend_reinvest: scenario.dividend_reinvest,
      positions: scenario.positions.map((p) => ({
        symbol: p.symbol,
        weight_pct: Number(p.weight_pct),
      })),
    });
    navigate('/builder');
  };

  return (
    <div className="sticky top-20 z-30 backdrop-blur-md bg-bg-canvas/80 border-b border-subtle">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <Eyebrow tone="aurum">
            {scenario.mode === 'basket' ? 'Basket' : 'Single'} · vs {scenario.benchmark_symbol}
          </Eyebrow>
          <div className="mt-2">
            <h1 className="font-display text-[26px] sm:text-3xl md:text-4xl tracking-tight text-text-primary truncate">
              {scenario.name}
            </h1>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <div className="flex items-center -space-x-2">
              {scenario.positions.map((p) => (
                <TickerChip key={p.symbol} symbol={p.symbol} className="ring-2 ring-bg-canvas" />
              ))}
            </div>
            <span className="text-text-muted text-[12.5px]">
              {fmt.date(scenario.start_date)} → {fmt.date(scenario.end_date)}
            </span>
            <span className="text-text-muted text-[12.5px] hidden sm:inline">
              ·{' '}
              {Number(scenario.recurring_amount) > 0
                ? `${fmt.shortMoney(scenario.recurring_amount)} ${scenario.recurring_freq}`
                : `lump sum ${fmt.shortMoney(scenario.initial_amount)}`}
            </span>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
          {isSample ? (
            <Button
              variant="primary"
              size="md"
              iconLeft={<Save className="w-4 h-4" />}
              loading={saveSample.isPending}
              onClick={() => saveSample.mutate()}
            >
              Save scenario
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="md"
                iconLeft={<RotateCcw className="w-4 h-4" />}
                loading={rerun.isPending}
                onClick={() => rerun.mutate()}
              >
                {en.cta.rerun}
              </Button>
              <Button
                variant="secondary"
                size="md"
                iconLeft={<CopyIcon className="w-4 h-4" />}
                loading={dup.isPending}
                onClick={() => dup.mutate()}
              >
                {en.cta.duplicate}
              </Button>
              <Button
                variant="ghost"
                size="md"
                iconLeft={<GitCompareArrows className="w-4 h-4" />}
                onClick={() => navigate(`/compare?a=${scenario.id}`)}
              >
                {en.cta.compare}
              </Button>
              <Button
                variant="danger"
                size="md"
                iconLeft={<Trash2 className="w-4 h-4" />}
                loading={del.isPending}
                onClick={() => del.mutate()}
              >
                {en.cta.delete}
              </Button>
            </>
          )}
          <Button variant="ghost" size="md" onClick={goEdit}>
            {en.cta.edit}
          </Button>
        </div>

        {/* Mobile compact actions */}
        <div className="md:hidden flex items-center gap-2 self-start">
          {isSample ? (
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Save className="w-4 h-4" />}
              loading={saveSample.isPending}
              onClick={() => saveSample.mutate()}
            >
              Save
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<RotateCcw className="w-4 h-4" />}
              loading={rerun.isPending}
              onClick={() => rerun.mutate()}
            >
              {en.cta.rerun}
            </Button>
          )}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="More actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((m) => !m)}
              className={classNames(
                'h-9 w-9 rounded-sm border grid place-items-center cursor-pointer transition-colors',
                menuOpen
                  ? 'border-strong bg-bg-surface-2 text-text-primary'
                  : 'border-DEFAULT text-text-secondary hover:text-text-primary hover:bg-bg-surface-2',
              )}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 z-40 min-w-[180px] rounded-md bg-bg-elevated border border-strong shadow-card py-1.5"
                >
                  <MenuItem onClick={goEdit}>{en.cta.edit}</MenuItem>
                  {!isSample ? (
                    <>
                      <MenuItem
                        onClick={() => {
                          dup.mutate();
                          setMenuOpen(false);
                        }}
                      >
                        <CopyIcon className="w-3.5 h-3.5" /> {en.cta.duplicate}
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          navigate(`/compare?a=${scenario.id}`);
                          setMenuOpen(false);
                        }}
                      >
                        <GitCompareArrows className="w-3.5 h-3.5" /> {en.cta.compare}
                      </MenuItem>
                      <div className="my-1.5 border-t border-DEFAULT" />
                      <MenuItem
                        danger
                        onClick={() => {
                          del.mutate();
                          setMenuOpen(false);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {en.cta.delete}
                      </MenuItem>
                    </>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'w-full flex items-center gap-2 px-3 h-9 text-[13.5px] text-left cursor-pointer',
        'transition-colors duration-150',
        danger
          ? 'text-negative hover:bg-negative/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}
