import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import { classNames } from '@/lib/formatters';
import { apiEndpoints } from '@/lib/api/endpoints';
import type { Security } from '@/lib/api/types';
import { TickerChip } from './TickerChip';

interface Props {
  value: string;
  onChange: (symbol: string, security?: Security) => void;
  placeholder?: string;
  invalid?: boolean;
}

interface AnchorRect {
  left: number;
  top: number;
  width: number;
  flipUp: boolean;
}

const DROPDOWN_HEIGHT_ESTIMATE = 380;
const VIEWPORT_PADDING = 12;

export function TickerPicker({ value, onChange, placeholder = 'Pick a ticker', invalid }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [rect, setRect] = useState<AnchorRect | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: all } = useQuery({
    queryKey: ['securities'],
    queryFn: apiEndpoints.listSecurities,
  });

  const items = useMemo(() => {
    if (!all) return [];
    const q = query.trim().toUpperCase();
    if (!q) return all.slice(0, 10);
    return all
      .filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
      .slice(0, 10);
  }, [all, query]);

  const computeRect = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - VIEWPORT_PADDING;
    const flipUp = spaceBelow < DROPDOWN_HEIGHT_ESTIMATE && r.top > spaceBelow;
    setRect({ left: r.left, top: flipUp ? r.top : r.bottom, width: r.width, flipUp });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computeRect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => computeRect();
    const onScroll = () => computeRect();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, items.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && items[activeIdx]) {
        e.preventDefault();
        const sec = items[activeIdx];
        onChange(sec.symbol, sec);
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, activeIdx, onChange]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const selected = useMemo(() => all?.find((s) => s.symbol === value), [all, value]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery('');
          setActiveIdx(0);
        }}
        className={classNames(
          'w-full h-12 sm:h-11 rounded-sm bg-bg-surface-2 border flex items-center gap-2 px-3 cursor-pointer',
          'transition-colors duration-200 text-body',
          invalid ? 'border-error' : 'border-DEFAULT hover:border-strong',
          open && 'border-brand',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <TickerChip symbol={selected.symbol} />
            <span className="font-mono text-text-primary">{selected.symbol}</span>
            <span className="text-text-secondary truncate hidden sm:inline">{selected.name}</span>
          </>
        ) : (
          <>
            <Search className="w-4 h-4 text-text-muted" strokeWidth={1.75} />
            <span className="text-text-muted">{placeholder}</span>
          </>
        )}
      </button>

      {open && rect
        ? createPortal(
            <AnimatePresence>
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: rect.flipUp ? 4 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: rect.flipUp ? 4 : -4 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[100] rounded-md bg-bg-elevated border border-strong shadow-card overflow-hidden"
                style={{
                  left: rect.left,
                  width: rect.width,
                  ...(rect.flipUp
                    ? { bottom: window.innerHeight - rect.top + 8 }
                    : { top: rect.top + 8 }),
                }}
              >
                <div className="p-2 border-b border-DEFAULT">
                  <div className="flex items-center gap-2 px-2 h-9 rounded-sm bg-bg-surface-2 border border-DEFAULT focus-within:border-brand">
                    <Search className="w-4 h-4 text-text-muted" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIdx(0);
                      }}
                      placeholder="Search by symbol or name..."
                      className="flex-1 bg-transparent outline-none text-body-s text-text-primary placeholder:text-text-muted font-mono"
                    />
                  </div>
                </div>
                <ul role="listbox" className="max-h-72 overflow-y-auto">
                  {items.length === 0 ? (
                    <li className="px-4 py-6 text-center text-text-muted text-body-s">
                      No matches.
                    </li>
                  ) : (
                    items.map((s, i) => (
                      <li
                        key={s.id}
                        role="option"
                        aria-selected={i === activeIdx}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => {
                          onChange(s.symbol, s);
                          setOpen(false);
                          setQuery('');
                        }}
                        className={classNames(
                          'flex items-center gap-3 px-3 h-12 cursor-pointer',
                          i === activeIdx ? 'bg-bg-surface-2' : 'hover:bg-bg-surface-2/60',
                        )}
                      >
                        <TickerChip symbol={s.symbol} />
                        <div className="flex-1 min-w-0">
                          <div className="text-body-s font-mono text-text-primary">{s.symbol}</div>
                          <div className="text-caption text-text-muted truncate">{s.name}</div>
                        </div>
                        <div className="text-micro text-text-muted uppercase tracking-wider hidden sm:block">
                          {s.exchange}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </motion.div>
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
