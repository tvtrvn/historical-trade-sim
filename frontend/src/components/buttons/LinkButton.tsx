import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { classNames } from '@/lib/formatters';

interface Props {
  to: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANT = {
  primary: 'bg-brand text-white hover:bg-brand-hover hover:shadow-cobalt',
  secondary:
    'bg-transparent text-text-primary border border-strong hover:border-text-secondary hover:bg-bg-surface-2',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface-2',
  premium: 'gradient-border bg-bg-surface text-aurum hover:text-white hover:shadow-aurum',
};

const SIZE = {
  sm: 'h-8 px-3 text-[13px] rounded-sm',
  md: 'h-10 px-4 text-sm rounded-sm',
  lg: 'h-12 px-6 text-[15px] rounded-md',
};

export function LinkButton({
  to,
  variant = 'secondary',
  size = 'md',
  className,
  children,
  iconLeft,
  iconRight,
}: Props) {
  return (
    <Link
      to={to}
      className={classNames(
        'inline-flex items-center gap-2 font-medium tracking-tight cursor-pointer select-none',
        'transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-premium',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    >
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </Link>
  );
}
