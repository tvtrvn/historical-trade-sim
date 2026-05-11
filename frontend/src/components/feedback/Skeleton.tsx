import { classNames } from '@/lib/formatters';

interface Props {
  className?: string;
  height?: number | string;
  width?: number | string;
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ className, height = 16, width = '100%', radius = 'sm' }: Props) {
  const r = radius === 'full' ? 'rounded-full' : `rounded-${radius}`;
  return (
    <div
      className={classNames('shimmer', r, className)}
      style={{ height, width }}
    />
  );
}
