# Results Dashboard — Override

Inherits MASTER. This is the most important page in the app.

## Layout (storyboard)

1. **Title strip** — sticky on scroll. Shows scenario name, ticker badges,
   period (e.g. `Jan 2011 → Apr 2026`), benchmark badge.
   - **`lg+`:** all actions inline on the right — Save / Re-run · Duplicate ·
     Compare · Edit · Delete · Export.
   - **Below `md`:** the primary action (Save or Re-run) stays visible, and
     the secondary actions collapse into a "More actions" dropdown menu.
     The menu uses `AnimatePresence` for entry/exit and closes on Escape /
     click-outside.
2. **"How to read this page" callout (v1.1, full-width glass card)** —
   appears just under the title strip. 2–3 sentences in plain English about
   how the page is structured and what to look for first. Includes a
   reminder that every `?` icon explains a term. Skippable but persistent.
3. **Hero KPI row** — 4 large `kpi-xl` cards, each with an `InfoBadge`
   adjacent to the eyebrow:
   - Final value
   - Total return (%, with $ delta below in muted mono)
   - CAGR
   - Vs benchmark (delta in pos/neg semantic color)
   Counters animate in from 0 with stagger 60ms. On reduced motion, no counter
   animation, only fade. Numerals clamp `text-[34px] sm:text-[42px]`.
4. **Growth chart** — full-width line + filled area chart, 420px tall.
   - Portfolio series in `--chart-1` cobalt, 2px stroke.
   - Benchmark in `--chart-2` lavender, 1.5px stroke, dashed.
   - Recurring contributions render as tiny tick marks on the x axis.
   - Tooltip is a glass card with date, both values, and delta.
   - Time range pill row: 1Y / 3Y / 5Y / 10Y / Max (replays animation).
   - `ChartFrame` carries `explain={{ what, read }}` so a tap on `?` shows
     "what this chart is" + "how to read it" without leaving the page.
5. **Secondary KPI row** — 4 medium cards, each with InfoBadge:
   - Volatility (annualized σ)
   - Max drawdown (with trough date in muted text)
   - Sharpe-like ratio (CAGR / volatility)
   - Best / worst year mini bars
6. **Drawdown chart** — half width, paired with **Annual returns** bars
   (positive in `--positive`, negative in `--negative`). Both `ChartFrame`s
   carry `explain` props.
7. **Basket breakdown (only if basket mode)** —
   - Stacked area chart of contribution by position.
   - Right-side legend doubles as a sortable mini table with weight, ending
     value, and contribution %.
8. **Trade ledger** table — every buy event (initial + each recurring), with
   date, price, shares, cumulative invested.
9. **Footer disclaimer band** — `Educational only. Not investment advice.`

## Plain-English explanations (v1.1)

Every KPI, every chart, every section eyebrow includes an `InfoBadge`. The
copy lives in `i18n/en.ts` under `results.explain` and pairs each metric
with a "what" line and a "how to read it" line. The glossary on the
methodology page is the canonical version of these definitions.

Examples:
- **Total return:** what = "How much your portfolio grew, expressed as a
  percent of what you put in." · read = "Includes both gains and any
  recurring contributions you added along the way."
- **Max drawdown:** what = "The worst peak-to-trough drop during this run." ·
  read = "Negative is bad. Bigger negative means more pain at the worst
  moment. Trough date is shown beneath."
- **Sharpe-like:** what = "Reward per unit of risk." · read = "Higher is
  better. We use CAGR ÷ volatility — close to the textbook definition with
  rf = 0."

## Visual rules

- Scroll progress: a 2px hairline at the very top fills with `--gradient-hairline`
  as the user scrolls. Replaces the typical sticky shadow.
- Each section has an eyebrow label and a "What does this mean?" link to
  `/methodology#<anchor>` (in addition to the InfoBadge tooltips).
- All numerical KPIs include "as of `<date>`" microcopy below.

## Mobile rules

- All page padding `px-4 sm:px-6`.
- Title strip wraps; secondary actions collapse into "More actions" below `md`
  (see §1 above).
- KPI row is `grid-cols-2 sm:grid-cols-4`.
- Growth chart container padding: `p-5 sm:p-6`.

## Loading

- Skeleton: title strip (real text immediately), KPIs as 4 shimmering blocks,
  charts as a single shimmer rectangle. Shimmer uses 1.4s linear gradient sweep
  paused under reduced-motion.

## Empty (run failed)

- Inline error card: cobalt-bordered, monospace error code chip, "Try again"
  primary button, "Edit scenario" secondary.
- Common backend codes the UI handles gracefully:
  `INSUFFICIENT_DATA`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## Anti-patterns

- No floating "share to twitter" buttons.
- No confetti on positive returns.
- No 3D charts. Ever.
- No KPI rendered without an `explain={{ what, read }}` prop.
- No actions buried under "More actions" on `lg+`.
