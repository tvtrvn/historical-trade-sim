import { en } from '@/i18n/en';
import { HairlineDivider } from './HairlineDivider';

export function Footer() {
  return (
    <footer className="mt-24">
      <HairlineDivider className="opacity-40" />
      <div className="max-w-container mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-text-muted text-body-s">
        <div>
          <span className="font-display text-text-secondary">{en.brand}</span>
          <span className="mx-3 opacity-50">·</span>
          <span>{en.disclaimer}</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com" className="hover:text-text-primary transition-colors cursor-pointer">
            GitHub
          </a>
          <a href="https://www.linkedin.com" className="hover:text-text-primary transition-colors cursor-pointer">
            LinkedIn
          </a>
          <span className="opacity-60">© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
