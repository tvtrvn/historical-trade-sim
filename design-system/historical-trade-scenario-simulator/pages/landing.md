# Landing Page — Override

Inherits MASTER. Overrides only what's listed here.

## Goal

Make a first-time visitor say "this looks like a real fintech product" within
three seconds — **and** give a non-finance visitor enough plain-English context
to feel safe clicking "Run a sample scenario" without signing up.

## Layout (top to bottom)

1. **Sticky floating navbar** (top-4, blurred glass, hairline border).
   - `lg+`: brand mark + inline routes + "New scenario" CTA right.
   - Below `lg`: brand mark + hamburger button right; tap opens a slide-in
     drawer (see MASTER §5.9).
2. **Hero** — full-bleed, 100vh on `lg+`. Two columns:
   - **L:** Eyebrow chip ("Educational simulator · Not investment advice"),
     `display-xl` headline (Fraunces, mobile-clamped to 40px), subhead,
     primary + secondary CTAs.
   - **R:** floating "scenario card" with animated KPI counters (sample
     AAPL-since-2011 result), parallax tilt on mouse move (max ±4°),
     subtle aurora background.
3. **Plain-English explainer ("What is this?")** — full-width glass card with
   a 1-sentence summary ("In one sentence: this app shows what would have
   happened if you invested back then.") and a 2–3-sentence body that names
   no jargon. Lightbulb/BookOpen icon.
4. **How it works** — 3-step section with numbered display numerals
   ("01 / 02 / 03"), Lucide icons (`MousePointerClick`, `CalendarDays`,
   `BookOpen`), and a 1-line description per step. Stagger reveal at 100ms.
   Hairline connectors between cards on `md+`.
5. **Logo strip** ("powered by data from" / "trusted methodology") — muted,
   hairline divider above and below.
6. **Bento value props** — 5-card asymmetric grid:
   - "Lump sum or DCA"
   - "Basket portfolios"
   - "Benchmark anything against SPY/QQQ"
   - "CAGR, drawdown, volatility — explained"
   - "Save and compare scenarios"
7. **Sample scenarios strip** — 4 horizontally scrolling preset cards that
   one-click into the builder.
8. **Glossary (plain-English)** — 8-term grid (`md:grid-cols-2`):
   Ticker, Benchmark, Lump-sum, DCA, CAGR, Volatility, Drawdown, Sharpe.
   Each card uses MASTER §5.10's pattern: term + plain explanation + "WHY"
   eyebrow + 1-line "why this matters." No jargon.
9. **Methodology teaser** — 2-column block linking to `/methodology`.
10. **Final CTA band** with aurora backdrop + primary button.
11. **Footer** — minimal, slate hairline, copyright + GitHub + LinkedIn.

## Visual rules

- Hero background uses `--gradient-aurora` plus a 1px hairline horizon line at
  68vh using `--gradient-hairline`. Animate horizon's gradient position over
  18s, paused under `prefers-reduced-motion`.
- Scenario card floats with `box-shadow: --shadow-card`. On hover:
  `translateY(-4px)` + `--glow-cobalt`.
- Primary CTA: cobalt with subtle aurum hairline; secondary is ghost.
- Numbers in the floating scenario card are JetBrains Mono and animate from 0
  to final on enter (spring, 1100ms).
- All copy across sections 3, 4, and 8 lives in `i18n/en.ts` under
  `landing.plain`, `landing.howItWorks`, and `landing.glossary` — not inline.

## Mobile rules

- Hero headline clamps: `text-[40px] sm:text-[58px] md:text-[68px] lg:text-[80px]`.
- All sections use `px-4 sm:px-6` outer padding.
- The floating scenario card stacks below the headline below `lg`.

## Anti-patterns to avoid

- No "particles.js"-style floating dots.
- No bouncing arrow on hero.
- No purple-to-pink gradient buttons.
- No "AS SEEN ON" fake logos.
- No jargon in the "What is this?" or "How it works" sections — the rule is
  **anyone's grandma should be able to read it.**
- No infinite hover/pulse on glossary cards.
