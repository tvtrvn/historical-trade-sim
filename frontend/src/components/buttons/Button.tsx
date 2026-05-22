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
    'bg-brand text-bg-canvas hover:bg-brand-hover hover:shadow-lift focus-visible:ring-brand',
  secondary:
    'bg-transparent text-text-primary border border-strong hover:border-text-secondary hover:bg-bg-surface-2',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface-2',
  premium:
    'gradient-border bg-bg-surface text-aurum hover:text-white hover:shadow-lift',
  danger:
    'bg-transparent text-error border border-error/40 hover:bg-error/10 hover:border-error',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-body-s rounded-sm',
  md: 'h-10 px-4 text-sm rounded-sm',
  lg: 'h-12 px-6 text-body rounded-md',
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
