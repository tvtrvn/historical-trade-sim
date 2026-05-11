import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '@/lib/formatters';

type Variant = 'primary' | 'secondary' | 'ghost' | 'premium' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover hover:shadow-cobalt focus-visible:ring-brand',
  secondary:
    'bg-transparent text-text-primary border border-strong hover:border-text-secondary hover:bg-bg-surface-2',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface-2',
  premium:
    'gradient-border bg-bg-surface text-aurum hover:text-white hover:shadow-aurum',
  danger:
    'bg-transparent text-negative border border-negative/40 hover:bg-negative/10 hover:border-negative',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-sm',
  md: 'h-10 px-4 text-sm rounded-sm',
  lg: 'h-12 px-6 text-[15px] rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, children, iconLeft, iconRight, loading, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={classNames(
        'inline-flex items-center gap-2 font-medium tracking-tight cursor-pointer select-none',
        'transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-premium',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-label="loading"
        />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {iconRight}
    </button>
  );
});
