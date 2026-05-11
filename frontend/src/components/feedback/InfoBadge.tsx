import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

import { classNames } from '@/lib/formatters';

interface Props {
  what: string;
  read?: string;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
  children?: ReactNode;
}

const POPOVER_WIDTH = 280;
const VIEWPORT_PADDING = 12;

/**
 * A small "(?)" icon that opens a plain-English popover on hover (desktop) or click (mobile).
 * Uses a portal so it can never be clipped by `overflow:hidden` containers.
 */
export function InfoBadge({ what, read, size = 'sm', label, className, children }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; flipUp: boolean } | null>(null);

  const compute = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = r.left + r.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING));
    const estHeight = 160;
    const spaceBelow = window.innerHeight - r.bottom;
    const flipUp = spaceBelow < estHeight + 20 && r.top > spaceBelow;
    const top = flipUp ? r.top : r.bottom;
    setPos({ left, top, flipUp });
  };

  useLayoutEffect(() => {
    if (!open) return;
    compute();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => compute();
    const onResize = () => compute();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label ?? `Explain: ${what}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={classNames(
          'inline-flex items-center justify-center rounded-full text-text-muted hover:text-text-primary',
          'transition-colors duration-150 cursor-help',
          size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
          className,
        )}
      >
        {children ?? <HelpCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} strokeWidth={1.75} />}
      </button>

      {open && pos
        ? createPortal(
            <AnimatePresence>
              <motion.div
                ref={popRef}
                role="tooltip"
                initial={{ opacity: 0, y: pos.flipUp ? 4 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: pos.flipUp ? 4 : -4 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[120] rounded-md bg-bg-elevated border border-strong shadow-card p-3.5"
                style={{
                  left: pos.left,
                  width: POPOVER_WIDTH,
                  ...(pos.flipUp
                    ? { bottom: window.innerHeight - pos.top + 8 }
                    : { top: pos.top + 8 }),
                }}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
              >
                <div className="text-[12.5px] text-text-primary font-medium leading-snug">{what}</div>
                {read ? (
                  <div className="mt-2 pt-2 border-t border-DEFAULT text-[12px] text-text-secondary leading-relaxed">
                    {read}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
