import { classNames } from '@/lib/formatters';

export function HairlineDivider({ className }: { className?: string }) {
  return <div className={classNames('h-px w-full bg-hairline opacity-70', className)} />;
}
