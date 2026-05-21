import type { SelectHTMLAttributes } from 'react';
import { classNames } from '@/lib/formatters';

interface Option {
  value: string;
  label: string;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Option[];
  onChange: (v: string) => void;
}

export function Select({ options, onChange, value, className, ...rest }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={classNames(
        'w-full h-11 rounded-sm bg-bg-surface-2 border border-DEFAULT px-3 text-body',
        'text-text-primary outline-none focus:border-brand transition-colors duration-200 cursor-pointer',
        'appearance-none bg-no-repeat',
        className,
      )}
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'1.75\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
        backgroundPosition: 'right 0.75rem center',
        paddingRight: '2.25rem',
      }}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-bg-elevated text-text-primary">
          {o.label}
        </option>
      ))}
    </select>
  );
}
