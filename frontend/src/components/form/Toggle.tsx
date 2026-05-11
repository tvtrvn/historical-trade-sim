import { classNames } from '@/lib/formatters';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  hint?: string;
}

export function Toggle({ checked, onChange, label, hint }: Props) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div>
        {label ? <div className="text-[13.5px] text-text-primary">{label}</div> : null}
        {hint ? <div className="text-[12px] text-text-muted mt-0.5">{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={classNames(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 cursor-pointer',
          checked ? 'bg-brand' : 'bg-bg-surface-2 border border-DEFAULT',
        )}
      >
        <span
          className={classNames(
            'absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-premium',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}
