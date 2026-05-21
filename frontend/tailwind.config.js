/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // ── Warm Clay & Honey palette ──────────────────────────────────────
      // Warm espresso surfaces (no cold navy), a terracotta/clay primary, a
      // honey-gold highlight, and earthy semantic colors. All text/accent
      // pairings verified ≥4.5:1 (WCAG AA) on every surface token.
      colors: {
        bg: {
          canvas: '#15110E',
          canvas2: '#1A140F',
          surface: '#1E1813',
          surface2: '#261E18',
          elevated: '#2A211A',
        },
        text: {
          primary: '#F3EDE4',
          secondary: '#C3B5A4',
          // taupe; clears WCAG AA (≥5.5:1) on every surface token.
          muted: '#A89684',
          inverse: '#1A140F',
        },
        brand: {
          // terracotta/clay. Vivid as an accent on dark; primary buttons use
          // dark (text-bg-canvas) labels since white-on-clay is only ~3:1.
          DEFAULT: '#D9774B',
          hover: '#E68A5E',
        },
        aurum: {
          // honey gold (warm highlight / premium accent).
          DEFAULT: '#E6B24C',
          dim: '#CE9B3C',
        },
        // caramel = benchmark series (replaces the old lavender/purple).
        caramel: '#C99A6A',
        // Directional finance colors (gain/loss). Sage up, warm rust down.
        positive: '#7FA776',
        negative: '#D2664F',
        // Semantic state colors. success/error mirror positive/negative so the
        // finance hues and UI states stay in lockstep; each carries a *-soft
        // tint for fills/badges. Use these for status, not raw accents.
        success: { DEFAULT: '#7FA776', soft: 'rgba(127, 167, 118, 0.13)' },
        error: { DEFAULT: '#D2664F', soft: 'rgba(210, 102, 79, 0.13)' },
        warning: { DEFAULT: '#E6B24C', soft: 'rgba(230, 178, 76, 0.13)' },
        info: { DEFAULT: '#6FA8A0', soft: 'rgba(111, 168, 160, 0.13)' },
      },
      // Discrete type scale (size + line-height) mirrored from MASTER.md §3.
      // Weight and tracking stay as separate utilities so existing
      // font-semibold / tracking-* classes keep working without specificity
      // conflicts. Default Tailwind text-xs…text-2xl remain available.
      fontSize: {
        'display-xl': ['80px', '88px'],
        'display-l': ['58px', '64px'],
        'display-m': ['44px', '52px'],
        h1: ['36px', '44px'],
        h2: ['28px', '36px'],
        h3: ['20px', '28px'],
        'body-l': ['17px', '28px'],
        body: ['15px', '24px'],
        'body-s': ['13px', '20px'],
        caption: ['12px', '16px'],
        micro: ['11px', '14px'],
        // Mono numerals (KPIs). Same px as some headings but tighter leading.
        'kpi-xl': ['44px', '48px'],
        kpi: ['28px', '32px'],
        'kpi-s': ['20px', '24px'],
      },
      letterSpacing: {
        display: '-0.03em',
        heading: '-0.02em',
        eyebrow: '0.12em',
      },
      maxWidth: {
        container: '1280px',
      },
      borderColor: {
        // warm taupe hairlines (replaces cool slate borders)
        subtle: 'rgba(168, 150, 132, 0.10)',
        DEFAULT: 'rgba(168, 150, 132, 0.16)',
        strong: 'rgba(168, 150, 132, 0.26)',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -24px rgba(0,0,0,0.7)',
        // clay glow (replaces the old cobalt glow)
        clay: '0 0 0 1px rgba(217,119,75,0.35), 0 12px 40px -8px rgba(217,119,75,0.45)',
        aurum: '0 0 0 1px rgba(230,178,76,0.30), 0 12px 40px -8px rgba(230,178,76,0.35)',
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
      },
      backgroundImage: {
        aurora:
          'radial-gradient(1200px 600px at 20% 0%, rgba(217,119,75,0.16), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(230,178,76,0.12), transparent 60%), radial-gradient(700px 500px at 50% 100%, rgba(201,154,106,0.10), transparent 60%)',
        hairline:
          'linear-gradient(90deg, transparent, rgba(230,178,76,0.6), transparent)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
