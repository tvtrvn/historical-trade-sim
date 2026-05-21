import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '@/lib/formatters';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  inputClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { invalid, prefix, suffix, className, inputClassName, ...rest },
  ref,
) {
  return (
    <div
      className={classNames(
        'flex items-stretch h-11 rounded-sm bg-bg-surface-2 border transition-colors duration-200',
        invalid ? 'border-error' : 'border-DEFAULT focus-within:border-brand',
        className,
      )}
    >
      {prefix ? (
        <span className="flex items-center px-3 text-text-muted text-body-s font-mono border-r border-DEFAULT">
          {prefix}
        </span>
      ) : null}
      <input
        ref={ref}
        className={classNames(
          'flex-1 bg-transparent px-3 outline-none text-text-primary placeholder:text-text-muted text-body',
          'font-mono tabular',
          inputClassName,
        )}
        {...rest}
      />
      {suffix ? (
        <span className="flex items-center px-3 text-text-muted text-body-s font-mono border-l border-DEFAULT">
          {suffix}
        </span>
      ) : null}
    </div>
  );
});
