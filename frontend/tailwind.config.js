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
      // ── Graphite & Indigo palette ──────────────────────────────────────
      // Neutral graphite surfaces (no color temperature), one indigo-blue
      // primary, a single amber highlight, and muted directional semantics.
      // Brand/amber read AA (≥4.5:1) as text on canvas/surface; on solid fills
      // they pair with dark (text-bg-canvas) labels. No colored glows.
      colors: {
        bg: {
          canvas: '#0E0E10',
          canvas2: '#121214',
          surface: '#18181B',
          surface2: '#1F1F23',
          elevated: '#26262B',
        },
        text: {
          primary: '#F4F4F5',
          secondary: '#B4B4BD',
          // neutral gray; clears WCAG AA (≥4.5:1) on every surface token.
          muted: '#93939D',
          inverse: '#0E0E10',
        },
        brand: {
          // indigo-blue. AA as text/icon on canvas/surface; primary buttons
          // use dark (text-bg-canvas) labels since white-on-blue is only ~3.6:1.
          DEFAULT: '#4C82F0',
          hover: '#6A99F3',
        },
        aurum: {
          // amber — the single warm highlight / premium accent.
          DEFAULT: '#E0A23B',
          dim: '#C68C2E',
        },
        // caramel = benchmark series (muted tan, distinct from the amber accent).
        caramel: '#B99C74',
        // Directional finance colors (gain/loss). Muted green up, muted red down.
        positive: '#4EA46B',
        negative: '#D45D5D',
        // Semantic state colors. success/error mirror positive/negative so the
        // finance hues and UI states stay in lockstep; each carries a *-soft
        // tint for fills/badges. Use these for status, not raw accents.
        success: { DEFAULT: '#4EA46B', soft: 'rgba(78, 164, 107, 0.13)' },
        error: { DEFAULT: '#D45D5D', soft: 'rgba(212, 93, 93, 0.13)' },
        warning: { DEFAULT: '#E0A23B', soft: 'rgba(224, 162, 59, 0.13)' },
        info: { DEFAULT: '#4C82F0', soft: 'rgba(76, 130, 240, 0.13)' },
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
        // neutral hairlines on graphite
        subtle: 'rgba(255, 255, 255, 0.06)',
        DEFAULT: 'rgba(255, 255, 255, 0.10)',
        strong: 'rgba(255, 255, 255, 0.16)',
      },
      boxShadow: {
        // Neutral diffused elevation — no colored glows. A wide soft ambient
        // shadow plus a 1px top inner highlight; `lift` is the hover variant.
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -24px rgba(0,0,0,0.7)',
        lift: '0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 44px -18px rgba(0,0,0,0.75)',
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
      },
      backgroundImage: {
        // Neutral hairline for horizon dividers. No colored aurora backdrop —
        // surfaces stay flat graphite.
        hairline:
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
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
