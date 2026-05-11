import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { classNames } from '@/lib/formatters';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'glass' | 'premium';
  padded?: boolean;
  hoverable?: boolean;
  children: ReactNode;
}

const VARIANT = {
  flat: 'bg-bg-surface border border-DEFAULT shadow-card',
  glass: 'glass shadow-card',
  premium: 'gradient-border bg-bg-surface shadow-card',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'flat', padded = true, hoverable = false, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={classNames(
        'rounded-md relative',
        VARIANT[variant],
        padded && 'p-6',
        hoverable &&
          'transition-[transform,border-color] duration-200 ease-premium hover:-translate-y-0.5 hover:border-strong cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

interface MotionCardProps extends HTMLMotionProps<'div'> {
  variant?: 'flat' | 'glass' | 'premium';
  padded?: boolean;
  hoverable?: boolean;
  children: ReactNode;
}

export function MotionCard({
  variant = 'flat',
  padded = true,
  hoverable = false,
  className,
  children,
  ...rest
}: MotionCardProps) {
  return (
    <motion.div
      className={classNames(
        'rounded-md relative',
        VARIANT[variant],
        padded && 'p-6',
        hoverable &&
          'transition-[transform,border-color] duration-200 ease-premium hover:-translate-y-0.5 hover:border-strong cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
