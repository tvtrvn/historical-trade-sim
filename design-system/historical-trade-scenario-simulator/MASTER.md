# Historical Trade Scenario Simulator — Design System (MASTER)

> **Source of Truth.** Every page must comply with this file unless overridden in
> `design-system/historical-trade-scenario-simulator/pages/<page>.md`.
>
> Generated with the **UI/UX Pro Max** skill, then curated to match the brief:
> luxury dark-mode fintech analytics, cinematic data storytelling, subtle
> glassmorphism, premium typographic hierarchy.
>
> **v1.1 (May 2026)** added: a global `InfoBadge` pattern for plain-English
> explanations, a portal-rendering rule for popovers (so dropdowns and tooltips
> never get clipped by `overflow:hidden`), a hamburger-drawer pattern for
> sub-`lg` viewports, and responsive padding/typography clamps across all
> pages.

---

## 1. Product DNA

| Trait                | Direction                                                          |
| -------------------- | ------------------------------------------------------------------ |
| **Personality**      | Calm, intelligent, editorial, premium. Bloomberg × Stripe × Linear |
| **Emotional tone**   | Confidence without hype. Storytelling over flash.                  |
| **Information mood** | Dense but never cluttered. Whitespace is a luxury, not absence.    |
| **Data philosophy**  | "Show the truth beautifully." No false signals, no fake gains.     |
| **Anti-vibe**        | Crypto neon, gamified casino, generic Stripe-clone, bootstrap SaaS |

---

## 2. Visual Language

### 2.1 Style Foundation

- **Primary style:** **Editorial Dark Glass** — deep warm-espresso surfaces with
  tasteful glassmorphism, layered gradients, and a single hairline accent.
- **Secondary style:** **Precision Data** — chart areas are flat, high-contrast,
  with neutral grids and accent lines that do the talking.
- **Glass usage rule:** glass on glass is forbidden. Glass cards live on tinted
  backgrounds, never on top of other glass surfaces.

### 2.2 Color Tokens

> **Palette: "Warm Clay & Honey" (v2.0, 2026-05-21).** Replaced the original
> cold navy + electric cobalt + lavender/purple with warm espresso surfaces and
> earthy accents. All text/accent pairings verified WCAG AA (≥4.5:1) on every
> surface. Token names in code: `bg.*`, `text.*`, `brand`, `aurum`, `caramel`,
> `positive`/`negative`, `success`/`error`/`warning`/`info` (each `*-soft`).

```css
/* Warm espresso canvas */
--bg-canvas:       #15110E;   /* page background */
--bg-canvas-2:     #1A140F;   /* under-hero, between sections */
--bg-surface:      #1E1813;   /* cards, panels */
--bg-surface-2:    #261E18;   /* hovered cards, nested panels */
--bg-elevated:     #2A211A;   /* modals, popovers */

/* Hairlines & dividers (warm taupe) */
--border-subtle:   rgba(168, 150, 132, 0.10);
--border-default:  rgba(168, 150, 132, 0.16);
--border-strong:   rgba(168, 150, 132, 0.26);

/* Text */
--text-primary:    #F3EDE4;
--text-secondary:  #C3B5A4;
--text-muted:      #A89684;   /* taupe; AA ≥5.5:1 on every surface */
--text-inverse:    #1A140F;

/* Brand & accents */
--brand:           #D9774B;   /* terracotta/clay — primary action, focus, line */
--brand-hover:     #E68A5E;
--accent-aurum:    #E6B24C;   /* honey gold — premium highlight, glow */
--accent-aurum-2:  #CE9B3C;
--accent-caramel:  #C99A6A;   /* benchmark series (renamed from lavender) */

/* Semantic */
--positive:        #7FA776;   /* gains, outperformance (sage) */
--positive-soft:   rgba(127, 167, 118, 0.13);
--negative:        #D2664F;   /* losses, drawdowns (warm rust) */
--negative-soft:   rgba(210, 102, 79, 0.13);
--warning:         #E6B24C;
--info:            #6FA8A0;   /* dusty teal */

/* Chart palette (sequential, colorblind-aware) */
--chart-1: #D9774B;   /* portfolio */
--chart-2: #C99A6A;   /* benchmark */
--chart-3: #E6B24C;   /* highlight position */
--chart-4: #7FA776;   /* secondary positive */
--chart-5: #6FA8A0;   /* recurring contribution */
--chart-6: #C77B7B;   /* outlier / alt (warm rose) */
```

> **Button contrast note:** white-on-clay is only ~3:1, so primary buttons use
> **dark text** (`text-bg-canvas`) on the clay background (≈5.96:1). Clay stays
> vivid as an accent/line/focus color on dark surfaces.

### 2.3 Gradients & Glow

```css
--gradient-aurora:
  radial-gradient(1200px 600px at 20% 0%,  rgba(217,119,75,0.16), transparent 60%),
  radial-gradient(900px  500px at 90% 10%, rgba(230,178,76,0.12), transparent 60%),
  radial-gradient(700px  500px at 50% 100%, rgba(201,154,106,0.10), transparent 60%);

--gradient-hairline:
  linear-gradient(90deg, transparent, rgba(230,178,76,0.6), transparent);

--glow-clay:    0 0 0 1px rgba(217,119,75,0.35), 0 12px 40px -8px rgba(217,119,75,0.45);
--glow-aurum:   0 0 0 1px rgba(230,178,76,0.30), 0 12px 40px -8px rgba(230,178,76,0.35);
--shadow-card:  0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -24px rgba(0,0,0,0.7);
```

> **Anti-pattern:** never use full-bleed neon glow, never animate gradients
> faster than 8s, never stack three glow shadows on one element.

---

## 3. Typography

| Role                 | Font               | Why                                                                               |
| -------------------- | ------------------ | --------------------------------------------------------------------------------- |
| Display (marketing)  | **Fraunces**       | Editorial serif with optical-size axis. Used **only** for hero/marketing display. |
| UI / Body            | **Inter**          | Industry-standard, neutral, supports tabular figures.                             |
| Numerals (KPI/chart) | **JetBrains Mono** | Tabular monospace for tickers, KPIs, deltas. Aligns columns flawlessly.           |

```css
--font-display: 'Fraunces', 'Times New Roman', serif;
--font-sans:    'Inter', system-ui, -apple-system, sans-serif;
--font-mono:    'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
```

### Type scale (desktop)

| Token           | Size / line-height | Weight  | Tracking | Usage                          |
| --------------- | ------------------ | ------- | -------- | ------------------------------ |
| `display-xl`    | 80 / 88            | 400     | -0.04em  | Landing hero only              |
| `display-l`     | 56 / 64            | 400     | -0.03em  | Section hero, methodology hero |
| `h1`            | 36 / 44            | 600     | -0.02em  | Page title                     |
| `h2`            | 28 / 36            | 600     | -0.01em  | Card group title               |
| `h3`            | 20 / 28            | 600     | -0.01em  | Card title                     |
| `body-l`        | 17 / 28            | 400     | 0        | Long-form prose                |
| `body`          | 15 / 24            | 400     | 0        | UI default                     |
| `body-s`        | 13 / 20            | 400     | 0        | Caption, helper                |
| `eyebrow`       | 12 / 16            | 500     | 0.12em   | UPPERCASE eyebrow labels       |
| `kpi-xl` (mono) | 44 / 48            | 500     | -0.02em  | Hero KPI value                 |
| `kpi`    (mono) | 28 / 32            | 500     | -0.01em  | KPI value                      |
| `mono-s`        | 12 / 16            | 500     | 0        | Ticker chips                   |

> **Rule:** all numerical values that share columns must use `font-variant-numeric: tabular-nums;`
> or JetBrains Mono. Mixing proportional figures across columns is forbidden.

---

## 4. Spacing, Radii, Layout

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
--space-12: 48px; --space-16: 64px; --space-20: 80px; --space-24: 96px;

--radius-xs: 6px;   /* chips */
--radius-sm: 10px;  /* buttons, inputs */
--radius-md: 14px;  /* cards (default) */
--radius-lg: 20px;  /* hero cards, modals */
--radius-xl: 28px;  /* feature panels */

--container: 1280px;
--gutter:    24px;
--rail:      280px;  /* left side rail in app shell */
```

- Desktop-first. Breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`.
- Page max width: 1280 (marketing) / 1440 (app shell with rail).
- Vertical rhythm: 8px baseline grid. KPI rows clamp to multiples of 4.

---

## 5. Components (rules of the road)

### 5.1 Cards

- Base: `bg-surface` + `border-default` + `radius-md` + `shadow-card`.
- Hover: lift `translateY(-2px)`, border → `border-strong`, no scale transforms.
- Premium highlight card: 1px hairline gradient border using `--gradient-hairline`.
- Never nest glass inside glass. Use `bg-surface-2` for nested panels.

### 5.2 Buttons

| Variant       | Background                       | Text          | Border                      |
| ------------- | -------------------------------- | ------------- | --------------------------- |
| **Primary**   | `brand` (clay) → `brand-hover` | `text-bg-canvas` (dark) | none, `shadow-clay` on hover |
| **Secondary** | `transparent`                    | `text-primary` | `border-strong`              |
| **Ghost**     | `transparent`                    | `text-secondary` → primary on hover | none |
| **Premium**   | `transparent` + 1px aurum gradient border | `accent-aurum` | gradient hairline           |

- Height: `40` (md) / `48` (lg) / `32` (sm).
- Transition: `transform 200ms ease-out, background-color 160ms ease-out`.
- Focus ring: `ring-2 ring-offset-2 ring-offset-bg-canvas ring-brand`.

### 5.3 Form fields (`Field` component)

- Top-aligned label + helper hint. (Pick one style per page; never mix
  with floating labels.)
- Inputs: `bg-surface-2` + `border-default`, focus → `border-brand`
  + thin inset glow.
- Error state: `border-negative` + helper text in `--negative`.
- The `Field` component accepts an `explain={{ what, read }}` prop that
  renders an `InfoBadge` (§5.7) immediately after the label text — never
  inside the label, so click handlers don't collide.
- Helper text uses `leading-relaxed` for readability.
- Section headers (`Section` component in the builder) carry a `blurb`
  prop — a 1–2-line plain-English summary of what the section is for.

### 5.4 KPI cards

- Eyebrow label (uppercase, `--text-muted`) above mono numeral.
- `KpiCard` accepts `explain={{ what, read }}` and renders an `InfoBadge`
  adjacent to the eyebrow.
- Animated counter on enter (Framer Motion `useMotionValue` + `useSpring`).
- Delta chip: `+12.4%` in pos/neg semantic color, mono, with up/down arrow icon.
- Optional sparkline at the bottom — 32px tall, no axes, accent line only.
- Mobile clamp: numerals scale `text-[34px] sm:text-[42px]`.

### 5.5 Tables

- Sticky header, zebra rows OFF, hairline rows ON.
- All numeric columns right-aligned, mono.
- Ticker column: brand chip + name + secondary text in muted gray.

### 5.6 Charts (Recharts)

- Background transparent. Grid: 1px `--border-subtle`, dashed.
- Axis labels: 11px, `--text-muted`, mono.
- Tooltip: glass card, `bg-elevated/0.92` + backdrop-blur 14px, hairline border.
- Series colors come from chart palette tokens; never use random hex inline.
- Drawdown chart: filled area under zero, `--negative-soft` fill, `--negative`
  stroke at 1.5px.
- Every `ChartFrame` accepts an `explain={{ what, read }}` prop and surfaces an
  `InfoBadge` next to the title (see §5.7). The "what" line is a 1-line
  definition; the "read" line tells the user how to read the shape.
- Mobile padding: `p-5 sm:p-6`.

### 5.7 InfoBadge (plain-English tooltip) — **the v1.1 cornerstone**

The single source of truth for "what does this term mean?" content. Used
inside `Field`, `KpiCard`, `ChartFrame`, and the glossary.

- **Visual:** a small (16×16) circular `?` button. Subtle text color; on
  hover/focus → primary text color. No layout shift on hover.
- **Trigger:** click toggles, hover/focus opens, blur/Esc/click-outside
  closes. Mouse-into-popover keeps it open.
- **Render path:** **portal to `document.body`** with `position: fixed`
  computed from the trigger's `getBoundingClientRect()`. **Never** rendered
  inside the parent's DOM tree, so it is never clipped by
  `overflow:hidden` accordions, animated containers, or sticky strips.
- **Auto-flip:** if there isn't enough room below the trigger, the popover
  flips above (`bottom: viewport - top + 8`).
- **Content:** two lines max. The first (`what`) is a one-sentence
  definition. The optional second (`read`) is a "how to read it" or
  "why it matters" line.
- **Copy lives in `i18n/en.ts`**, never in components, so terms can be
  reused across pages (Builder, Results, Methodology, Glossary).

### 5.8 Comboboxes / pickers (`TickerPicker`)

- Trigger button matches `Input` styling.
- Dropdown panel rendered via **portal** to `document.body`, same rule as
  InfoBadge — `fixed` positioning, auto-flip, recompute on resize/scroll.
- Closes on Escape, click-outside, blur, route change.
- Keyboard nav: ↑/↓ to traverse, ↵ to select, Esc to close. ARIA listbox.

### 5.9 App shell & navigation (responsive)

- **`lg+`:** floating glass navbar at `top-4`, hairline border, all routes
  inline, brand mark left, primary "New scenario" CTA right.
- **Below `lg`:** the inline links collapse into a single hamburger button
  (40×40 tap target). Tapping opens a full-height **drawer** that slides in
  from the right with a backdrop. Drawer contains every route, the brand
  mark, and the primary CTA. Drawer locks body scroll, closes on route
  change and on Escape, and animates in via Framer Motion (260ms).
- Brand mark shortens to "HTS" on `xs`. The "New scenario" button text
  condenses to "New" on `md` and hides entirely on `xs`, where the drawer
  carries it instead.

### 5.10 Plain-English explainer cards (Glossary)

- Two-column responsive grid (`grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4`).
- Each card: term name (h4, semibold), 1–2-sentence plain explanation,
  hairline divider, "WHY" eyebrow + 1-line "why this matters."
- Hover: border lightens to `border-strong`, no transform shift.
- Used on the landing page and mirrored on the methodology page so the
  vocabulary surface area is always one click away.

---

## 6. Motion

- Library: **Framer Motion**.
- Default ease: `[0.22, 0.61, 0.36, 1]` (custom cubic, "premium").
- Default duration: `260ms` UI, `420ms` reveal, `680ms` hero.
- Stagger reveals: 60ms per item, max 5 items animated per view.
- Counters: spring `{ stiffness: 90, damping: 22, mass: 0.8 }`.
- **prefers-reduced-motion:** disable all reveal/lift animations, keep
  cross-fades only at 120ms.

> **Anti-pattern:** no infinite bounce/pulse on decorative elements. Spinners
> are the only allowed continuous animation.

---

## 7. Iconography

- **Lucide** is the only icon set. 24×24 viewbox, 1.5px stroke.
- Never use emoji as icons.
- Brand/ticker logos come from the seeded `securities.logo_url` field; if
  missing, use a 2-letter monogram chip in `--bg-surface-2`.

---

## 8. UX Writing

| Domain     | Use                                          | Avoid                                      |
| ---------- | -------------------------------------------- | ------------------------------------------ |
| Headlines  | "See how that decision could have played out." | "Calculate your gains!"                  |
| Buttons    | "Run simulation", "Compare", "Save scenario" | "Submit", "Click here"                     |
| Empty      | "No saved scenarios yet — your library starts here." | "No data."                         |
| Disclaimer | "Educational only. Not investment advice."   | (do not omit on results pages)             |
| Numbers    | Show **as of** date next to every KPI.       | Bare numbers without time context.         |

---

## 9. Page Inventory & Pattern Map

| Page                | Pattern                                     | Hero?              | Glass density |
| ------------------- | ------------------------------------------- | ------------------ | ------------- |
| `/`                 | Hero → "What is this?" → How it works → bento → samples → glossary → CTA | Cinematic | High |
| `/builder`          | Two-column: form + live preview (stacked <`lg`); intro card with InfoBadge tip | Compact | Medium |
| `/results/:id`      | "How to read this page" callout → KPIs → growth → secondary KPIs → charts → ledger | Sticky title strip | Medium |
| `/scenarios`        | Card grid + filter rail                     | Slim               | Low           |
| `/compare`          | Synced split panels                         | Slim               | Low           |
| `/methodology`      | Glossary → long-form editorial sections     | Editorial          | Low           |

App shell uses a floating glass navbar at the top; primary nav inline on `lg+`,
collapsing into a hamburger drawer below `lg` (see §5.9). The "New scenario"
CTA is the only branded action and lives on the right of the navbar.

---

## 10. Pre-Delivery Checklist

### Visual & motion
- [ ] No emojis as icons (Lucide only).
- [ ] All clickable items have `cursor-pointer` + visible hover.
- [ ] Hover never causes layout shift (use color/translate-Y/border, not scale).
- [ ] Focus rings visible on every focusable element.
- [ ] All numerical columns use tabular figures.
- [ ] Every KPI has an "as of" date.
- [ ] Color is never the sole indicator (gain/loss also use ▲/▼ icons).
- [ ] Glass: never glass-on-glass. Always over a tinted/gradient bg.
- [ ] `prefers-reduced-motion` disables all reveal animations.
- [ ] Disclaimer "Educational only. Not investment advice." present on results.

### Accessibility & plain-English (v1.1)
- [ ] Every Form Field, KPI, and Chart that uses domain terminology supplies
      an `explain={{ what, read }}` prop and renders an `InfoBadge`.
- [ ] InfoBadge popover is rendered via portal — verified by opening it inside
      the Builder accordion (parent has `overflow:hidden`) and confirming no clip.
- [ ] Glossary section appears on the landing page and on the methodology page
      with the same 8 terms.
- [ ] Every `Section` in the builder has a `blurb` plain-English summary.

### Responsive (v1.1)
- [ ] Verified at 320 / 375 / 430 / 768 / 1024 / 1280 / 1440 / 1920.
- [ ] Below `lg`, the navbar hamburger opens a drawer with all routes + CTA.
- [ ] `TickerPicker` dropdown is fully visible on mobile (no clipping).
- [ ] Builder stacks form-over-preview below `lg`; live preview is sticky on `lg+`.
- [ ] Results title strip uses a "More actions" menu below `md`.
- [ ] Page paddings: `px-4 sm:px-6` on every top-level page container.
- [ ] Display headlines clamp via `text-[40px] sm:text-[58px] md:text-[68px]…`.
