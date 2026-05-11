# Product Requirements Document — Historical Trade Scenario Simulator

**Status:** v1.1 (shipped, hardened)
**Owner:** Portfolio project — Thinh
**Last updated:** May 2026

> v1.1 added: full mobile-responsive overhaul, plain-English explainers
> (InfoBadge tooltips, How-it-works section, 8-term glossary, results
> "how to read this page" callout), portal-rendered ticker picker / popovers
> that escape `overflow:hidden`, and a defense-in-depth security pass
> (rate limiting, body cap, security headers, schema guards, per-client
> scenario cap, sanitized error envelope), and a daily storage-TTL cron
> (Alembic migration + bearer-token-protected admin endpoint + GitHub Actions
> workflow). 50 tests passing.

---

## 1. Product overview

**Historical Trade Scenario Simulator** is a premium, dark-mode fintech web
application that lets a user replay a hypothetical investment decision against
real historical price data. A user picks a security (or a basket of securities),
chooses a start date, an end date, and an investment policy (lump sum, recurring
contributions, or both), then receives an animated, story-driven results
dashboard showing how that decision would have performed — including return,
CAGR, volatility, max drawdown, and benchmark-relative performance.

The product is positioned as an **investment intelligence platform**, not a
calculator. Every interaction is editorial, every chart is curated, and every
number is contextualized with a definition and an "as of" date.

---

## 2. Problem statement

Most investors — especially retail investors and finance students — reason
about historical performance using two flawed heuristics:

1. **Recency bias:** "AAPL has been good lately, so it must have always been good."
2. **Narrative bias:** "Everyone says I should have bought NVDA in 2020."

Existing tools that answer "what if?" questions are either:

- **Too coarse** (broker UIs only show *your actual* portfolio history),
- **Too academic** (Yahoo Finance / Portfolio Visualizer feel like 2008 Excel
  reports), or
- **Too gamified** (crypto sim apps that trivialize risk).

There is no tool that combines:
- A **calm, premium fintech aesthetic**,
- **Real historical price logic** (lump sum, DCA, basket, benchmark),
- **Rigorous metrics** (CAGR, drawdown, volatility, Sharpe-like),
- **Storytelling UX** that makes the math feel intuitive.

This product fills that gap.

---

## 3. Target users

| Persona               | Goals                                                       | Why they care                              |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| **Finance student**   | Run case studies (AAPL since 2011, DCA into SPY).           | Class projects, internship interviews.     |
| **Retail investor**   | Sanity-check intuitions before deploying capital.           | "Was lump sum or DCA actually better?"     |
| **First-time / older user** | Understand "what would have happened if I invested" without finance jargon. | Confidence to engage with the data at all. |
| **Hiring manager**    | Evaluate the candidate's product+engineering taste.         | Looks at the live demo.                    |
| **Junior PM/analyst** | Build a quick narrative around a hypothetical thesis.       | Slide-ready charts and tables.             |

This PRD is also explicitly written to make the **hiring manager** persona
think: "this candidate clearly cares about design and product quality."

---

## 4. Goals and non-goals

### 4.1 Goals (v1)

1. Run an accurate single-position simulation for any seeded ticker between any
   two valid market dates.
2. Run a basket simulation with weight-driven allocation across up to 10 tickers.
3. Run recurring-contribution (DCA) simulations at monthly or quarterly cadence.
4. Compare any scenario against any seeded benchmark (default SPY).
5. Save, rerun, duplicate, and delete scenarios.
6. Compare two saved scenarios side-by-side with synchronized charts.
7. Deliver an editorial-grade UI that meets the design-system master spec.
8. Be deployable end-to-end (Vercel + Koyeb + hosted Postgres) in <30 minutes.

### 4.2 Non-goals (v1)

- Real-time / live market data.
- Real account integration (Plaid, brokerage OAuth, etc.).
- Tax-lot accounting, wash sale rules, or after-tax returns.
- Authentication / multi-tenant accounts (v1 stores scenarios via a `client_id`
  cookie + localStorage; full auth deferred to v2).
- Options, derivatives, futures, or leverage.
- Mobile-first UI: the product is desktop-first by composition, but v1.1 is
  fully mobile-responsive (hamburger drawer nav, stacked builder, portal-based
  popovers, condensed action bars).

---

## 5. Key user stories

| ID  | As a…             | I want to…                                                                | So that…                                              |
| --- | ----------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| US1 | Visitor           | See an immediate, beautiful sample scenario on the landing page           | I trust the product within 3 seconds                  |
| US2 | User              | Pick AAPL, set a Jan 2011 buy date, invest $10,000, and run               | I see my hypothetical outcome with charts and metrics |
| US3 | User              | Add a recurring monthly contribution of $500                              | I can model dollar-cost averaging                     |
| US4 | User              | Build a basket of 4 tickers with custom weights                           | I can model a diversified portfolio                   |
| US5 | User              | Compare my scenario against SPY                                           | I know if I beat the market                           |
| US6 | User              | Save and name a scenario                                                  | I can revisit and rerun it                            |
| US7 | User              | Duplicate a saved scenario and tweak parameters                           | I can A/B-test entry dates                            |
| US8 | User              | Compare two saved scenarios in a single view                              | I can show a stakeholder the better thesis            |
| US9 | User              | Read a methodology page                                                   | I trust the math                                      |
| US10| Hiring manager    | Inspect the GitHub repo and quickly understand the architecture           | I evaluate the candidate fairly                       |
| US11| First-time user   | Hover a `?` next to any term, KPI, or chart and read what it means        | I'm not lost in finance jargon                        |
| US12| Mobile user       | Use the entire product on my phone with the nav and dropdowns reachable   | I don't bounce because the UI is broken               |

---

## 6. Functional requirements

### 6.1 Simulation engine

- **FR-1.** Find nearest valid trading day (forward fill ≤7 days) for a buy date.
- **FR-2.** Compute shares from amount/price, or amount from shares/price.
- **FR-3.** Compute a daily portfolio value series across the holding period.
- **FR-4.** Compute total return %, dollar gain/loss, and CAGR.
- **FR-5.** Compute annualized volatility from daily log returns.
- **FR-6.** Compute peak-to-trough max drawdown and trough date.
- **FR-7.** Compute annual returns for each calendar year in the holding period.
- **FR-8.** Compute Sharpe-like ratio = CAGR / volatility (rf = 0 in v1).
- **FR-9.** Recurring contributions: deposit at monthly/quarterly cadence on
  the next valid trading day, buy at that day's price.
- **FR-10.** Basket: simulate each leg, normalize weights to 100%, allocate
  initial capital pro-rata, recurring contributions split pro-rata.
- **FR-11.** Benchmark: same engine runs in parallel with $1 base normalization
  for comparison. Outperformance is `(p_return − b_return)` in pp.
- **FR-12.** Optional fees: deduct fee % per buy.

### 6.2 Scenario CRUD

- **FR-13.** Create scenario (POST /scenarios).
- **FR-14.** Run scenario without saving (POST /simulate).
- **FR-15.** List scenarios for the current `client_id` (GET /scenarios).
- **FR-16.** Rerun, duplicate, delete (POST /scenarios/{id}/run, /duplicate, DELETE).
- **FR-17.** Compare two scenarios (POST /compare with `[scenario_id_a, scenario_id_b]`).

### 6.3 Catalog / data

- **FR-18.** List available securities and benchmarks.
- **FR-19.** Ticker autocomplete by symbol or name.
- **FR-20.** Seeded historical price coverage from 2010-01-01 to 2026-04-29 for
  the v1 ticker set (AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSLA, SPY, QQQ, VTI,
  DIA, IWM).

### 6.4 UX requirements

- **FR-21.** Live preview in builder updates within 250 ms of input changes.
- **FR-22.** All charts have an "Explain" affordance linking to methodology.
- **FR-23.** Every numeric KPI carries an "as of" date.
- **FR-24.** Animated KPI counters on results dashboard, disabled under
  `prefers-reduced-motion`.
- **FR-25.** Empty, loading, and error states for every dynamic surface.

### 6.5 Accessibility & cognitive load (v1.1)

- **FR-26.** Every form field, KPI, and chart exposes an `InfoBadge` (small
  `?` button) that opens a portal-rendered tooltip with a 1-line definition
  and a 1-line "why this matters." Closes on Escape, click-outside, blur.
- **FR-27.** The landing page includes a "What is this?" hero callout, a
  3-step "How it works" section, and an 8-term plain-English glossary
  (Ticker, Benchmark, Lump-sum, DCA, CAGR, Volatility, Drawdown, Sharpe).
- **FR-28.** The methodology page surfaces the same glossary at the top
  before the formal sections.
- **FR-29.** The results page leads with a "How to read this page" card.
- **FR-30.** Every popover (`InfoBadge`, ticker picker dropdown) is rendered
  via React portal with computed `fixed` positioning — never clipped by
  parent `overflow:hidden`, auto-flips above the trigger when there's no
  room below.

### 6.6 Mobile responsiveness (v1.1)

- **FR-31.** Below `lg` (1024px) the top nav collapses into a hamburger
  button that opens a full-height slide-out drawer with all routes and the
  primary "New scenario" CTA. Drawer locks body scroll, closes on route
  change and on Escape.
- **FR-32.** All page paddings step down on mobile (`px-4 sm:px-6`),
  display headlines clamp (`text-[40px] sm:text-[58px] md:text-[68px]`),
  KPI numerals clamp (`text-[34px] sm:text-[42px]`).
- **FR-33.** The builder stacks form-over-preview below `lg`; the live
  preview is sticky only on `lg+`.
- **FR-34.** The results title strip collapses extra actions (Duplicate,
  Compare, Delete, Edit) into a "More actions" dropdown menu below `md`.
- **FR-35.** The basket position rows use a responsive grid that adapts
  columns at `sm`.

### 6.7 Security & abuse protection (v1.1)

- **FR-36.** Per-IP global rate limit (default 120 req/min) plus a tighter
  bucket for compute-heavy endpoints (`/simulate`, scenario mutations —
  default 20 req/min). 429 includes `Retry-After`.
- **FR-37.** Hard request body size cap (default 64 KB), rejecting both
  oversized `Content-Length` and oversized streamed bodies.
- **FR-38.** `X-Client-Id` must match `^[A-Fa-f0-9\-]{16,64}$`. Invalid
  formats reject with `INVALID_INPUT` before reaching any DB lookup.
- **FR-39.** `ScenarioIn` schema guards: `start_date >= 2000-01-01`,
  `end_date <= today + 7d`, range `<= 50 years`, `initial_amount <= $10B`,
  `recurring_amount <= $1B`, ticker symbol regex
  `^[A-Z][A-Z0-9.\-]{0,15}$`, max 10 positions, no duplicates within a
  basket, basket weights must sum to 100%.
- **FR-40.** Per-client cap on saved scenarios (default 100). Returns
  `LIMIT_REACHED` when reached.
- **FR-41.** Hardened response headers on every response (incl. errors):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (camera/mic/geo/cohort off), COOP/CORP, and
  `Cache-Control: no-store` on `/api/*`. HSTS in production.
- **FR-42.** All errors use a single envelope:
  `{"error": {"code", "message", "field"}}`. The validation handler
  never echoes user input back. The catch-all 500 handler logs the
  exception server-side and returns `INTERNAL_ERROR` only.

### 6.8 Storage TTL (v1.1)

- **FR-43.** `scenario_results` rows older than `RESULT_RETENTION_DAYS`
  (default **30**) are deleted by a daily cleanup job. Saved scenarios
  themselves are **never** deleted; the user can re-run any of them at any
  time to regenerate fresh metrics. Cascade deletes on `annual_metrics`
  are enforced via `ondelete="CASCADE"` on the FK.
- **FR-44.** The cleanup is exposed as `POST /api/v1/maintenance/cleanup`,
  guarded by a constant-time `Authorization: Bearer <MAINTENANCE_TOKEN>`
  check. When the token is empty (default), the endpoint returns 503
  `MAINTENANCE_DISABLED` so a misconfigured deploy can't be invoked
  anonymously.
- **FR-45.** A daily GitHub Actions workflow (`.github/workflows/cleanup.yml`)
  fires the endpoint at 03:17 UTC. The job retries 3× with backoff so a Neon
  cold-start is absorbed, surfaces the deleted-row count in the run summary,
  and times out at 5 minutes. A CLI alternative (`scripts/cleanup.py`) is
  available for self-hosted / systemd-timer setups.
- **FR-46.** A `scenario_results.run_at` index is added (Alembic migration
  `0002_result_run_at_index`) so the daily `DELETE … WHERE run_at < cutoff`
  is a fast range scan rather than a full table scan.

---

## 7. Non-functional requirements

| Category              | Target                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| **Performance**       | Backend `/simulate` p95 ≤ 250ms for 15 years × 12 tickers on Postgres.     |
| **Frontend bundle**   | Initial JS ≤ 220KB gzipped after route splitting.                          |
| **Lighthouse**        | Performance ≥ 92, Accessibility ≥ 95, Best practices ≥ 95 on landing.       |
| **Accessibility**     | WCAG 2.2 AA. Color contrast ≥ 4.5:1 for body, 3:1 for chart axis labels. Every term reachable via inline `?` tooltip; glossary mirrored on landing + methodology. |
| **Browser support**   | Last 2 of Chrome/Edge/Firefox/Safari. No IE.                               |
| **Reliability**       | Graceful 4xx/5xx with sanitized structured error JSON; client renders friendly UI; generic 500 handler logs server-side and never leaks tracebacks. |
| **Privacy**           | No PII collected; `client_id` is a UUID stored in localStorage. Format-validated server-side. |
| **Observability**     | Structured logs (FastAPI), request_id header, p95 timing in logs.          |
| **Security**          | CORS allowlist via env (no `*`); parameterized SQL via SQLAlchemy; tiered rate limit per IP (global + heavy endpoints); body-size cap; hardened response headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP/CORP, HSTS in prod); per-client scenario cap; schema-level guards on every user input; sanitized error envelope. See §6.7 + §11. |
| **Mobile**            | Functional on iOS Safari + Android Chrome from `xs` (320px) upward. Hamburger drawer below `lg`. All popovers escape `overflow:hidden` via portals. |
| **i18n readiness**    | All copy lives in a single `i18n/en.ts` map (no hardcoded strings in v1) — including every plain-English explanation and glossary term. |
| **Reduced motion**    | All reveal animations off when user prefers reduced motion.                |

---

## 8. UX & design principles

The product follows the persisted design system at
`design-system/historical-trade-scenario-simulator/MASTER.md`. Highlights:

1. **Editorial dark glass.** Deep midnight canvas, single hairline accent
   (Aurum gold), tasteful glass for elevated surfaces.
2. **Premium typographic hierarchy.** Fraunces for marketing display, Inter
   for UI, JetBrains Mono for numerals — tabular figures everywhere.
3. **Storytelling over dashboards.** The Results page is a top-to-bottom
   storyboard, not a wall of widgets.
4. **Calm motion.** 260ms UI transitions, premium cubic ease, no infinite
   pulses, no confetti.
5. **Truth-first.** Every chart links to methodology; every KPI has an "as of"
   date; "Educational only" disclaimer on every results page.
6. **Anti-patterns banned:** scale-on-hover that shifts layout, glass-on-glass,
   neon gradient buttons, fake "AS SEEN ON" logos, 3D charts.

---

## 9. Technical architecture

### 9.1 High-level

```
┌──────────────────┐   HTTPS/JSON    ┌─────────────────┐    SQL    ┌──────────────┐
│  Frontend (SPA)  │ ◄────────────►  │  Backend API    │ ◄──────►  │  PostgreSQL  │
│  Vite + React    │                 │  FastAPI        │           │  (Neon/Koyeb)│
│  Tailwind        │                 │  SQLAlchemy 2   │           │              │
│  Framer Motion   │                 │  Pydantic v2    │           │              │
│  Recharts        │                 │                 │           │              │
└──────────────────┘                 └─────────────────┘           └──────────────┘
        ▲                                     ▲
        │                                     │
        │            (Vercel)                 │       (Koyeb container)
        └─────────────────────────────────────┘
```

### 9.2 Frontend

- **Build:** Vite 5 + React 18 + TypeScript 5.
- **Styling:** Tailwind 3 with custom design tokens; CSS custom properties for
  the design system.
- **Animation:** Framer Motion 11.
- **Charts:** Recharts 2.
- **Routing:** React Router v6 with route-level code splitting.
- **State:** TanStack Query for server cache; Zustand for transient UI state.
- **Forms:** React Hook Form + Zod resolver.

### 9.3 Backend

- **Runtime:** Python 3.11.
- **Framework:** FastAPI + Uvicorn.
- **ORM:** SQLAlchemy 2.0 (async) with Alembic migrations.
- **Validation:** Pydantic v2.
- **Numerics:** Pure Python in v1 (small enough rows). NumPy-ready service
  layer for v1.1.
- **Layout:** routes → services → repositories → models. Calculations live in
  pure functions in `services/finance/`.

### 9.4 Database

- **Engine:** PostgreSQL 16.
- **Hosting:** Neon (free tier) or Koyeb-managed Postgres.
- **Migrations:** Alembic; seed via `scripts/seed.py`.

---

## 10. Data model overview

(Full DDL lives in `backend/alembic/versions/0001_init.py`.)

```
securities                 benchmarks                 historical_prices
─────────────              ─────────────              ─────────────
id (pk)                    id (pk)                    id (pk)
symbol uniq                symbol uniq                security_id (fk)
name                       name                       price_date
exchange                   description                close_price NUMERIC(18,6)
asset_class                logo_url                   adj_close   NUMERIC(18,6)
logo_url                                              volume      BIGINT
created_at                                            INDEX (security_id, price_date)

scenarios                  scenario_positions         scenario_results
─────────────              ─────────────              ─────────────
id (pk)                    id (pk)                    id (pk)
client_id                  scenario_id (fk)           scenario_id (fk)
name                       security_id (fk)           run_at
mode (single|basket|       weight_pct                 final_value
       recurring)          shares (nullable)          total_return_pct
benchmark_symbol           amount (nullable)          cagr_pct
start_date                                            volatility_pct
end_date                                              max_drawdown_pct
initial_amount             annual_metrics             benchmark_final_value
recurring_amount           ─────────────              benchmark_total_return_pct
recurring_freq             id (pk)                    relative_return_pct
fees_pct                   scenario_result_id (fk)    payload JSONB  ← time series
dividend_reinvest BOOL     year                       run_ms
created_at                 portfolio_return_pct
                           benchmark_return_pct       comparison_runs
                                                      ─────────────
                                                      id (pk)
                                                      client_id
                                                      scenario_a_id (fk)
                                                      scenario_b_id (fk)
                                                      created_at
```

Notes:

- `scenario_results.payload` stores the daily series + drawdown series + trade
  ledger as JSONB to avoid millions of rows.
- All money columns are `NUMERIC(18,6)`. Percentages are `NUMERIC(10,6)` and
  expressed as percent units (12.4 = 12.4%, not 0.124).
- `client_id` is a UUID v4 generated by the frontend on first visit; it stays
  in a cookie and `localStorage`. v1 has no auth.

---

## 11. API overview

Versioned under `/api/v1`. JSON in / JSON out. All scenario-scoped endpoints
require an `X-Client-Id` header matching `^[A-Fa-f0-9\-]{16,64}$`.

| Method | Path                              | Purpose                                              | Heavy bucket |
| ------ | --------------------------------- | ---------------------------------------------------- | :----------: |
| GET    | `/health`                         | Liveness probe (rate-limit exempt).                  |              |
| GET    | `/api/v1/securities`              | Paginated list of seeded securities.                 |              |
| GET    | `/api/v1/securities/search?q=`    | Autocomplete by symbol or name.                      |              |
| GET    | `/api/v1/benchmarks`              | List of seeded benchmarks.                           |              |
| POST   | `/api/v1/simulate`                | Run a simulation **without** saving.                 | ✓            |
| POST   | `/api/v1/scenarios`               | Save a scenario (and run it).                        | ✓            |
| GET    | `/api/v1/scenarios`               | List scenarios for current client (cap 200).         |              |
| GET    | `/api/v1/scenarios/{id}`          | Fetch one scenario + latest result.                  |              |
| POST   | `/api/v1/scenarios/{id}/run`      | Re-run latest config (idempotent).                   | ✓            |
| POST   | `/api/v1/scenarios/{id}/duplicate`| Clone a scenario.                                    | ✓            |
| DELETE | `/api/v1/scenarios/{id}`          | Delete a scenario and its results.                   | ✓            |
| POST   | `/api/v1/compare`                 | Run a comparison between two scenarios.              |              |
| GET    | `/api/v1/methodology`             | Static methodology JSON (used to render the page).   |              |
| POST   | `/api/v1/maintenance/cleanup`     | Admin-only TTL job. Bearer-token auth. Returns deleted-row report. |  |

Heavy-bucket endpoints burn an additional, tighter token bucket on top of
the global limiter — see §6.7 / FR-36.

Errors use a single structured envelope (no input reflection, no stack
traces):

```json
{ "error": { "code": "INVALID_INPUT", "message": "end_date must be after start_date", "field": "end_date" } }
```

| Code                | HTTP | Meaning                                                    |
| ------------------- | :--: | ---------------------------------------------------------- |
| `INVALID_INPUT`     | 422  | Request failed schema validation or an `X-Client-Id` check. |
| `INSUFFICIENT_DATA` | 422  | The chosen window has no price coverage for some symbol.   |
| `LIMIT_REACHED`     | 400  | Per-client scenario cap exceeded.                          |
| `NOT_FOUND`         | 404  | Resource doesn't exist OR isn't scoped to this client.     |
| `PAYLOAD_TOO_LARGE` | 413  | Request body exceeds `MAX_BODY_BYTES`.                     |
| `RATE_LIMITED`      | 429  | Per-IP bucket emptied. Includes `Retry-After` header.      |
| `INTERNAL_ERROR`    | 500  | Catch-all. Server logs the real exception; client gets nothing identifying. |
| `UNAUTHORIZED`      | 401  | Missing or invalid maintenance bearer token (admin route only). |
| `MAINTENANCE_DISABLED` | 503 | `MAINTENANCE_TOKEN` is unset; the cleanup endpoint is intentionally hard-disabled. |

---

## 12. Success criteria

The project is considered "shippable for portfolio" when:

1. The landing page is visually striking on first paint (LCP ≤ 2.0s on a
   throttled 4G run).
2. A user can run AAPL since Jan 2011 with $10K and reach the Results page in
   ≤ 3 clicks from the landing page.
3. The Results page passes Lighthouse accessibility ≥ 95.
4. The README walks a hiring manager through architecture, design system, run
   instructions, and "what was hard" in under 5 minutes of reading.
5. The app is live at a public URL backed by a public GitHub repo.
6. All 12 user stories pass end-to-end smoke tests.
7. **50 backend tests pass** (14 finance unit tests + 26 e2e security tests +
   10 maintenance/TTL tests).
8. `npm audit --omit=dev` reports zero vulnerabilities.

---

## 13. Future enhancements

- **v1.1 (shipped)** — Mobile-responsive overhaul; plain-English explainers
  (InfoBadge, How-it-works, glossary); portal-rendered popovers; full
  defense-in-depth security pass (rate limit, body cap, schema guards,
  hardened headers, sanitized errors, per-client cap).
- **v1.2** — Live price refresh via a single nightly batch (yfinance pipeline).
- **v1.3** — Sector/factor tilt analysis, rolling correlation vs benchmark.
- **v1.4** — Strategy presets (60/40, all-weather), buy-the-dip simulator.
- **v1.5** — Multi-currency, FX-aware simulations.
- **v2.0** — Authentication (email magic links), shareable scenario URLs,
  printable PDF reports, optional Plaid integration.

---

## 14. Risks / assumptions

| Risk                                                       | Mitigation                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Real-world data licensing                                  | Use seeded historical prices for v1; document the pipeline as future work.      |
| Edge cases on holidays / halted trading                    | Forward-fill nearest valid trading day, capped at 7 calendar days.              |
| Drawdown/volatility math errors hurt credibility           | Unit-tested in `tests/test_finance.py`; methodology page mirrors test fixtures. |
| Glassmorphism + dark mode hurts accessibility              | Enforce 4.5:1 contrast; provide non-color indicators (▲/▼).                     |
| Free-tier hosting cold starts                              | Backend exposes `/health`; frontend shows skeleton during cold starts.          |
| Scope creep ("just add auth")                              | v2 deferred; v1.1 frozen.                                                       |
| Spam / abuse via public endpoints                          | Tiered rate limit, body cap, per-client scenario cap, schema guards (FR-36–42). |
| ID enumeration / IDOR via integer scenario IDs             | Every query filters on `client_id`; server-side X-Client-Id format validation.  |
| Non-finance users overwhelmed by jargon                    | InfoBadge tooltips on every term, glossary on landing + methodology, plain-English explainers (FR-26–29). |
| Mobile UX broken (clipped dropdowns, hidden nav)           | Portal-rendered popovers, hamburger drawer, responsive paddings (FR-30–35).     |
| Database fills up on free-tier Postgres                    | Daily TTL cron deletes `scenario_results` older than 30d; saved scenarios kept (FR-43–46). |

---

## 15. Deployment plan

### 15.1 Environments

| Env       | URL                                        | Branch    |
| --------- | ------------------------------------------ | --------- |
| Local     | `http://localhost:5173` + `:8000`          | any       |
| Preview   | Vercel auto-preview                        | PR        |
| Prod      | `https://hts.example.app` + `…koyeb.app`   | `main`    |

### 15.2 Frontend (Vercel)

1. Connect GitHub repo, select `frontend/` as project root.
2. Build command: `npm run build`. Output: `dist/`.
3. Env: `VITE_API_BASE_URL=https://<backend>.koyeb.app`.
4. Framework preset: Vite.

### 15.3 Backend (Koyeb)

1. Create a service from GitHub repo, root `backend/`.
2. Builder: Dockerfile (provided).
3. Internal port `8000`. Health check `GET /health`.
4. Env (full list in `backend/.env.example`):
   - `DATABASE_URL=postgresql+asyncpg://…`
   - `CORS_ALLOW_ORIGINS=https://<frontend>.vercel.app`
   - `ENV=production`
   - `RATE_LIMIT_PER_MINUTE=120`
   - `HEAVY_RATE_LIMIT_PER_MINUTE=20`
   - `MAX_BODY_BYTES=65536`
   - `MAX_SCENARIOS_PER_CLIENT=100`
   - `TRUST_PROXY=true` (Koyeb terminates TLS at the edge and forwards
     `X-Forwarded-For`)
   - `RESULT_RETENTION_DAYS=30` (TTL for `scenario_results`)
   - `MAINTENANCE_TOKEN=<openssl rand -hex 32>` (also set as a GitHub repo
     secret of the same name so the daily TTL workflow can authenticate)
5. Run `alembic upgrade head` then `python scripts/seed.py` on first deploy.

### 15.4 Database

- Provision Neon free-tier Postgres 16.
- Copy connection string to Koyeb env.
- Run migrations + seed.

### 15.5 Smoke checklist

- [ ] `GET /health` returns 200.
- [ ] `GET /api/v1/securities` returns ≥ 12 rows.
- [ ] Landing page LCP ≤ 2.0s on 4G throttle.
- [ ] AAPL since 2011, $10K → Results renders, animates, no console errors.
- [ ] Compare two scenarios side-by-side renders charts in sync.
- [ ] `POST /api/v1/maintenance/cleanup` without a token returns 401; with the
      configured bearer token returns 200 + JSON report.
- [ ] GitHub Actions "TTL cleanup" workflow runs successfully (manual dispatch).
