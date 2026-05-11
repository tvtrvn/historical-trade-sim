# Scenario Builder — Override

Inherits MASTER.

## Layout

Two columns at `lg+`, stacked at `<lg`.

- **Intro card (full-width, top of page):** a glass card with a 1-paragraph
  plain-English description of what the builder is and a tip pointing out
  the `?` info badges. Persistent — never collapses. Required for v1.1.
- **Left (form, 56% width on `lg+`):** vertical accordion of 5 sections:
  1. Strategy (Single position / Basket / Recurring contributions)
  2. Position(s) — ticker picker (autocomplete with logo + name + exchange)
  3. Dates (buy date, end date, "Today" pill toggle)
  4. Investment (amount $ vs share quantity tab; recurring options)
  5. Comparison (benchmark dropdown, "include SPY by default" toggle,
     dividend-reinvest toggle, fees % toggle)
- **Right (live preview, 44% width on `lg+`):** sticky panel that updates as
  the user types. Shows:
  - Estimated final value (`kpi-xl` mono, animates on each change)
  - Mini growth chart (90 keypoints, animated stroke)
  - Quick "as of" line
  - "Run full simulation →" CTA pinned bottom

## Plain-English explanations (v1.1)

- Every `Section` carries a `blurb` prop — a 1–2-line summary of what the
  section is for, written for someone who doesn't know finance.
- Every `Field` inside the form passes `explain={{ what, read }}` so the
  user can hover/tap a `?` next to the label and read what the field
  controls and how it affects the outcome. Copy lives in
  `en.builder.help`.
- Examples (paraphrased):
  - **Initial amount:** "How much you'd have invested on day one. Even $100
    is enough to see meaningful charts."
  - **Recurring contributions:** "Add a monthly or quarterly deposit. This
    is dollar-cost averaging — buying more shares regardless of price."
  - **Benchmark:** "What to compare against. SPY (S&P 500) is the most
    common — beating it by even a few percent over years is a big deal."

## Interactions

- Each section header has a step number, current value summary on the right,
  and a chevron. Clicking expands smoothly (260ms).
- Validation is inline and never blocks typing — show a hairline negative
  border on blur for invalid fields.
- **Ticker picker** uses the portal pattern from MASTER §5.8: dropdown
  rendered into `document.body`, `fixed` positioning, auto-flips above the
  trigger when there's no room below, recomputes on scroll/resize.
  Keyboard: ↑/↓ traverse, ↵ select, ESC closes.
- **Section animations.** The accordion's `motion.div` carries
  `overflow:hidden` for the height animation only — the dropdown is
  outside the accordion's DOM (portal), so it is never clipped.
- Basket mode: weights must sum to 100%. A horizontal weight bar shows live
  segments per ticker. Auto-balance helper button on row hover.

## Mobile rules

- Below `lg`, the layout stacks: form first, then live preview as a normal
  (non-sticky) panel below it.
- The basket position rows use a responsive grid (`grid-cols-1 sm:grid-cols-12`)
  so symbol + weight inputs aren't crushed on narrow screens.
- All content padding: `px-4 sm:px-6`.

## Empty / loading

- Empty preview: muted illustration + "Pick a ticker to see a live preview."
- Computing preview: shimmer over the KPI value (1.2s loop, paused on
  reduced-motion).

## Anti-patterns

- No multi-step wizard with full page transitions.
- No required fields hidden behind tabs.
- No success toasts that hide errors.
- No `?` icons that lack the InfoBadge tooltip wiring (every term needs
  copy in `en.builder.help`).
- No tooltips rendered inside `overflow:hidden` parents — always portal.
