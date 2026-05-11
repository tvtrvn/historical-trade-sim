/** Number / date formatters used across KPIs, tables, and tooltips. */

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const usdPrecise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const pct1 = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const pct2 = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dec2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const fmt = {
  money: (v: number | string) => usd.format(typeof v === 'string' ? Number(v) : v),
  moneyPrecise: (v: number | string) =>
    usdPrecise.format(typeof v === 'string' ? Number(v) : v),
  delta: (v: number | string) => {
    const n = typeof v === 'string' ? Number(v) : v;
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    return `${sign}${usd.format(Math.abs(n))}`;
  },
  pct: (v: number | string, places = 2) => {
    const n = typeof v === 'string' ? Number(v) : v;
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    const f = places === 1 ? pct1 : pct2;
    return `${sign}${f.format(Math.abs(n))}%`;
  },
  pctRaw: (v: number | string, places = 2) => {
    const n = typeof v === 'string' ? Number(v) : v;
    const f = places === 1 ? pct1 : pct2;
    return `${f.format(n)}%`;
  },
  dec: (v: number | string) => dec2.format(typeof v === 'string' ? Number(v) : v),
  shortMoney: (v: number | string) => {
    const n = Math.abs(typeof v === 'string' ? Number(v) : v);
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
    return usd.format(n);
  },
  date: (iso: string, opts: 'short' | 'long' = 'short') => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: opts === 'long' ? 'long' : 'short',
      day: 'numeric',
    });
  },
  monthYear: (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
};

export function classNames(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}
