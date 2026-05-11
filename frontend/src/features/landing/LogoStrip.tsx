import { HairlineDivider } from '@/components/layout/HairlineDivider';

const ITEMS = [
  'Adjusted-close prices',
  'Pro-rata DCA',
  'Forward-fill on holidays',
  'Rebased benchmarks',
  'Full methodology',
];

export function LogoStrip() {
  return (
    <section className="relative">
      <HairlineDivider className="opacity-40" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-10 gap-y-3 text-[11.5px] sm:text-[12px] uppercase tracking-[0.2em] text-text-muted">
        <span className="text-text-secondary normal-case tracking-normal text-[12.5px] mr-4">
          Engineered with
        </span>
        {ITEMS.map((it) => (
          <span key={it} className="opacity-80 hover:opacity-100 transition-opacity">
            {it}
          </span>
        ))}
      </div>
      <HairlineDivider className="opacity-40" />
    </section>
  );
}
