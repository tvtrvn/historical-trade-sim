import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  GitCompareArrows,
  Home,
  LineChart,
  Menu,
  NotebookText,
  Sparkles,
  X,
} from 'lucide-react';

import { en } from '@/i18n/en';
import { classNames } from '@/lib/formatters';
import { LinkButton } from '@/components/buttons/LinkButton';
import { Footer } from './Footer';

const NAV = [
  { to: '/', label: en.nav.landing, icon: Home, end: true },
  { to: '/builder', label: en.nav.builder, icon: LineChart },
  { to: '/scenarios', label: en.nav.saved, icon: Compass },
  { to: '/compare', label: en.nav.compare, icon: GitCompareArrows },
  { to: '/methodology', label: en.nav.methodology, icon: NotebookText },
];

export function AppShell() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-bg-canvas">
      <FloatingNavbar />
      <main className={classNames('flex-1', isLanding ? '' : 'pt-24')}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function FloatingNavbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-50 mx-auto max-w-container"
      >
        <div className="glass rounded-md flex items-center justify-between gap-2 pl-3 pr-2 sm:px-4 h-14">
          <NavLink to="/" className="flex items-center gap-2 cursor-pointer group min-w-0">
            <BrandMark />
            <span className="font-display text-body sm:text-body tracking-tight text-text-primary group-hover:text-white transition-colors truncate">
              <span className="hidden sm:inline">{en.brand}</span>
              <span className="sm:hidden">{en.brandShort}</span>
            </span>
          </NavLink>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.slice(1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  classNames(
                    'group relative px-3 h-9 inline-flex items-center gap-2 rounded-sm text-body-s whitespace-nowrap',
                    'transition-colors duration-200 cursor-pointer',
                    isActive
                      ? 'text-text-primary bg-bg-surface-2'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-2',
                  )
                }
              >
                <item.icon className="w-4 h-4" strokeWidth={1.5} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:block">
              <LinkButton
                to="/builder"
                variant="primary"
                size="sm"
                iconLeft={<Sparkles className="w-4 h-4" />}
              >
                <span className="hidden md:inline">New scenario</span>
                <span className="md:hidden">New</span>
              </LinkButton>
            </div>
            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((m) => !m)}
              className={classNames(
                'lg:hidden h-10 w-10 rounded-sm grid place-items-center cursor-pointer',
                'border transition-colors duration-200',
                menuOpen
                  ? 'border-strong bg-bg-surface-2 text-text-primary'
                  : 'border-DEFAULT text-text-secondary hover:text-text-primary hover:bg-bg-surface-2',
              )}
            >
              <AnimatePresence initial={false} mode="wait">
                {menuOpen ? (
                  <motion.span
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <X className="w-5 h-5" strokeWidth={1.6} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="m"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Menu className="w-5 h-5" strokeWidth={1.6} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 z-40 bg-bg-canvas/85 backdrop-blur-md"
          />
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
            className="lg:hidden fixed top-[76px] left-3 right-3 sm:left-4 sm:right-4 z-40 mx-auto max-w-container"
          >
            <div className="glass rounded-md p-3">
              <ul className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        classNames(
                          'flex items-center gap-3 h-12 px-3 rounded-sm text-body',
                          'transition-colors duration-200',
                          isActive
                            ? 'text-text-primary bg-bg-surface-2 border border-strong'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-2 border border-transparent',
                        )
                      }
                    >
                      <item.icon className="w-4 h-4" strokeWidth={1.6} />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-DEFAULT">
                <LinkButton
                  to="/builder"
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                  iconLeft={<Sparkles className="w-4 h-4" />}
                >
                  Start a new scenario
                </LinkButton>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function BrandMark() {
  return (
    <div className="w-8 h-8 rounded-md bg-bg-surface-2 grid place-items-center border border-DEFAULT relative overflow-hidden flex-shrink-0">
      <svg viewBox="0 0 32 32" className="w-5 h-5">
        <defs>
          <linearGradient id="bm" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--brand)" />
            <stop offset="1" stopColor="var(--caramel)" />
          </linearGradient>
        </defs>
        <path
          d="M5 22 L11 14 L16 18 L22 9 L27 14"
          stroke="url(#bm)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="27" cy="14" r="2" fill="var(--aurum)" />
      </svg>
    </div>
  );
}
