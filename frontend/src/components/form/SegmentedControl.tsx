import { motion } from 'framer-motion';
import { classNames } from '@/lib/formatters';

interface Item<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  items: Item<T>[];
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  items,
  size = 'md',
  className,
  ariaLabel,
}: Props<T>) {
  const idx = items.findIndex((it) => it.value === value);
  const segWidth = 100 / items.length;
  return (
    <div
      className={classNames(
        'relative inline-flex bg-bg-surface-2 border border-DEFAULT rounded-sm p-1',
        size === 'sm' ? 'h-9' : 'h-11',
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="absolute top-1 bottom-1 rounded-xs bg-brand/15 border border-brand/30"
        style={{ width: `calc(${segWidth}% - 8px)`, left: `calc(${segWidth * idx}% + 4px)` }}
      />
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={classNames(
            'relative z-10 flex-1 px-3 text-body-s font-medium tracking-tight rounded-xs cursor-pointer',
            'transition-colors duration-200',
            value === it.value ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
