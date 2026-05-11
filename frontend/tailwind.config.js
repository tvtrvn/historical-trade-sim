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
      colors: {
        bg: {
          canvas: '#070B14',
          canvas2: '#0A1020',
          surface: '#0E1424',
          surface2: '#121A2E',
          elevated: '#182241',
        },
        text: {
          primary: '#E8EDF7',
          secondary: '#94A3B8',
          muted: '#64748B',
          inverse: '#0B1220',
        },
        brand: {
          DEFAULT: '#3D6CFF',
          hover: '#5B86FF',
        },
        aurum: {
          DEFAULT: '#F4C770',
          dim: '#E5B25C',
        },
        lavender: '#A78BFA',
        positive: '#5EE2A0',
        negative: '#FF7B7B',
        info: '#5BB6FF',
      },
      borderColor: {
        subtle: 'rgba(148, 163, 184, 0.08)',
        DEFAULT: 'rgba(148, 163, 184, 0.14)',
        strong: 'rgba(148, 163, 184, 0.24)',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -24px rgba(0,0,0,0.6)',
        cobalt: '0 0 0 1px rgba(61,108,255,0.35), 0 12px 40px -8px rgba(61,108,255,0.45)',
        aurum: '0 0 0 1px rgba(244,199,112,0.30), 0 12px 40px -8px rgba(244,199,112,0.35)',
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
          'radial-gradient(1200px 600px at 20% 0%, rgba(61,108,255,0.18), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(167,139,250,0.14), transparent 60%), radial-gradient(700px 500px at 50% 100%, rgba(244,199,112,0.10), transparent 60%)',
        hairline:
          'linear-gradient(90deg, transparent, rgba(244,199,112,0.6), transparent)',
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
