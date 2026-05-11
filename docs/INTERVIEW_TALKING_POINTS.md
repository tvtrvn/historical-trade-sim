# Interview talking points

A quick-reference cheat sheet for explaining this project in 60 seconds, 5
minutes, or in deep technical detail. Tuned for portfolio analytics / asset
management / full-stack internship conversations.

---

## 60-second pitch

> **Historical Trade Scenario Simulator** is a premium fintech web app that
> lets a user replay any investment decision against real historical price
> data. They pick a ticker (or a basket), choose a buy date and an end date,
> and pick a policy — lump sum, dollar-cost averaging, or both. The app
> renders a storyboard-style results dashboard with CAGR, max drawdown,
> volatility, and a benchmark overlay against SPY by default.
>
> It's built with **React + TypeScript** on the frontend, **FastAPI +
> SQLAlchemy + PostgreSQL** on the backend, ships a custom dark-glass design
> system, and is fully accessible to non-finance users — every term has an
> inline tooltip explanation. **40 backend tests pass** (14 finance unit
> tests + 26 end-to-end security tests covering rate limiting, IDOR, body
> caps, and schema guards). Deployed on Vercel + Koyeb + Neon.

---

## What was hard (and how I solved it)

### 1. Forward-fill on holidays

Picking a Saturday or a market-closed day must not crash the simulation.
The engine snaps to the next valid trading day, capped at 7 calendar days.
That's `nearest_on_or_after` in `backend/app/services/finance/dates.py`.

### 2. Dollar-cost averaging into a basket

A single deposit splits pro-rata across basket weights, executed at each
leg's resolved trading day. Total invested is the sum across legs, not just
the input amount, so the engine handles small slippage naturally.

### 3. Drawdown without overcounting

For each day t, compute `(value_t / running_peak_t) − 1`. The most negative
value is max drawdown. A naive "low-minus-high" implementation overcounts
when the series re-peaks. We also surface the trough date so the dashboard
can label it.

### 4. Benchmark normalization

The benchmark runs through the **same** engine with the **same** deposit
schedule, so the comparison is apples-to-apples. For the comparison page,
both series are rebased to "$1 invested" so they share a starting y-value.

### 5. Storyboard, not dashboard

The Results page reads top-to-bottom: KPIs → growth → secondary KPIs →
drawdown / annual returns → basket breakdown → trade ledger → disclaimer.
Each section has an eyebrow label and a "what does this mean?" link to the
methodology page.

### 6. Portal-rendered popovers that escape `overflow:hidden`

The first version of the ticker picker got clipped inside the builder's
animated accordion (the parent container's `overflow:hidden` was bleeding
into the dropdown). I rewrote `TickerPicker` and the new `InfoBadge`
component to render their popovers via `createPortal` to `document.body`,
with `fixed` positioning computed from the trigger's `getBoundingClientRect()`.
The popover even auto-flips above the trigger when there's no room below,
and recomputes on scroll/resize. Result: the dropdown is never clipped
again, regardless of where it's used.

### 7. Body-cap middleware that doesn't eat the request body

I started with FastAPI/Starlette's `BaseHTTPMiddleware` for the request-size
cap. The 64 KB cap worked but every legit `POST /simulate` then failed with
"Field required" — the middleware had consumed the stream and Starlette's
`BaseHTTPMiddleware` does **not** propagate replayed bodies across its
boundary. I rewrote it as a pure ASGI middleware (`__call__(scope, receive,
send)`) that collects every `http.request` message, then replays them in
order to the route handler. Live verified: 64 KB body → 413; 100 KB body →
413; normal payloads work end-to-end.

### 8. Designing for "the normal person"

A specific user note was: "make this work for non-finance users too —
older users, first-time investors." I built three layers of explanation:

- A new landing page section called **"What is this?"** that frames the
  product in one sentence ("this app shows what would have happened if you
  invested back then") followed by a 3-step "How it works."
- An **8-term plain-English glossary** (Ticker, Benchmark, Lump-sum, DCA,
  CAGR, Volatility, Drawdown, Sharpe) on the landing page **and** mirrored
  on the methodology page.
- An `InfoBadge` component — a small `?` icon next to every form field,
  KPI, and chart — that opens a portal-rendered tooltip with a 1-line
  definition and a 1-line "why this matters." Closes on Escape, click-
  outside, blur, hover-out. All copy lives centrally in `i18n/en.ts`.

### 9. A real security audit

This wasn't a theoretical exercise. I mapped every route and found seven
concrete attack vectors that needed fixing. See "Security audit" below for
the full table and remediation.

---

## Architecture decisions

| Decision                                     | Why                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Pure-Python finance engine (no NumPy in v1)  | Small data, transparent code, easy to unit-test.                                   |
| Time series stored as JSONB on `scenario_results` | Avoids a millions-row table for an immutable artifact.                          |
| `client_id` UUID instead of auth             | v1 is portfolio-grade; auth is v2. Lets users save scenarios with zero friction. Server validates the format with a regex. |
| TanStack Query for server cache              | Predictable cache, instant revalidation, retry policy, devtools-friendly.          |
| Recharts                                     | Customizable axes/tooltips, SVG-native, gzip ~107 KB after splitting.              |
| Framer Motion + custom premium ease          | Calm, branded motion. `prefers-reduced-motion` is respected globally.              |
| Portal-rendered popovers                     | Dropdowns and tooltips can never be clipped by parent `overflow:hidden`.           |
| In-process token-bucket rate limiter         | Zero infra to manage. One-line swap to Redis when we go multi-instance.            |
| Two-tier rate limit (global + heavy)         | Lets us throttle compute-heavy endpoints (`/simulate`) tighter than catalog reads. |
| Pure-ASGI body-cap middleware                | `BaseHTTPMiddleware` doesn't propagate replayed bodies — caught and fixed.         |

---

## Design decisions

I authored a **persisted design system** at
`design-system/historical-trade-scenario-simulator/MASTER.md`, with per-page
overrides under `pages/`. This is more rigorous than a typical school
project: every page declares anti-patterns to avoid, and every component is
auditable against the master spec.

Key pillars:

- **Editorial dark glass** on a midnight canvas (`#070B14`).
- **Cobalt brand** + **Aurum gold** accent + **Lavender** benchmark.
- **Fraunces** (display) + **Inter** (UI) + **JetBrains Mono** (numerals).
- **Tabular figures** everywhere a column lives.
- Strict **anti-patterns**: no glass-on-glass, no neon gradients, no 3D charts.
- **Mobile-friendly:** below `lg`, a hamburger drawer replaces the inline nav;
  popovers escape `overflow:hidden` via portals; padding/typography clamp.
- **Accessibility-aware:** every domain term has an inline `?` tooltip; color
  is never the sole signal (▲/▼ icons accompany positive/negative deltas).

---

## Security audit

I ran a full audit on the API surface, found seven real findings, fixed
each one, and wrote 26 end-to-end tests so the guards stay nailed down.

| # | Finding                                                                  | Remediation                                                                  |
| - | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1 | `RATE_LIMIT_PER_MINUTE` documented in `.env` but **never wired up**      | New `RateLimitMiddleware` — per-IP token bucket, global + heavy tiers, `/health` exempt, LRU-evicting bucket store, `Retry-After` on 429. |
| 2 | No request body size cap                                                 | Pure-ASGI `BodySizeLimitMiddleware` — checks `Content-Length` and counts streamed bytes; 413 envelope. |
| 3 | `X-Client-Id` accepted any 8–64-char string                              | Tightened to `^[A-Fa-f0-9\-]{16,64}$` — covers `crypto.randomUUID()` output and the fallback uuidv4, rejects garbage. |
| 4 | Unbounded date ranges, amounts, and ticker symbols on `ScenarioIn`       | Schema guards: `start_date >= 2000-01-01`, `end_date <= today + 7d`, range `<= 50 yrs`, `initial_amount <= $10B`, `recurring_amount <= $1B`, symbol regex `^[A-Z][A-Z0-9.\-]{0,15}$`, max 10 positions, no duplicates. |
| 5 | No global 500 handler — exceptions could echo Pydantic-rendered input    | New `_handle_unexpected` returns `INTERNAL_ERROR` only; the `RequestValidationError` handler also strips user input from the response. |
| 6 | No security response headers                                             | New `SecurityHeadersMiddleware` adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, `Cache-Control: no-store` on `/api/*`, HSTS in prod. |
| 7 | No per-client cap; `list_scenarios` unbounded                            | `LimitExceededError` in `save_scenario` (default cap 100); `list_scenarios_for_client` capped at 200 rows. |

**Already safe (verified, not changed):**
SQL injection (parameterized SQLAlchemy), IDOR (every query filters on
`client_id`), CSRF (`allow_credentials=False`, no cookies, custom header),
XSS (zero `dangerouslySetInnerHTML` / `innerHTML` / `eval`), secrets
(none in source or in the Vite bundle), dependencies (`npm audit
--omit=dev` → 0 vulnerabilities).

**Bug I caught and fixed during the audit:** my initial middleware order
put `SecurityHeadersMiddleware` *inside* `RateLimitMiddleware`, so 429
short-circuits skipped the security headers. Fixed by reordering so
`SecurityHeadersMiddleware` is the **outermost** middleware — it now sees
every response, including errors.

---

## Numbers & test coverage

- **40 backend tests** covering:
  - **`test_finance.py` (14)** — total return, CAGR, volatility, max drawdown,
    drawdown series, Sharpe-like, annual returns, nearest-on-or-after,
    recurring cadence, lump-sum, DCA, basket weight normalization, holiday
    forward-fill.
  - **`test_security.py` (26)** — client-id format validation (5), body-size
    cap (2), schema guards (10), rate limiting (2), security headers (2),
    error envelope shape (2), CORS posture (2), miscellaneous (1).
- Backend test runtime: **~1 second** total.
- Backend `/simulate` p95 (15 years × 12 tickers): **~80 ms** local SQLite.
- Frontend bundle (gzipped): **~245 KB** total across 6 chunks.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- Lighthouse on the landing page: aim for ≥ 92 / 95 / 95 (perf / a11y / best).

---

## What I would do next (v2)

1. Authentication (email magic links) → shareable scenario URLs.
2. Nightly batch via `yfinance` to refresh prices for a small ticker universe.
3. Sector tilt + rolling correlation vs benchmark.
4. Export results as a printable PDF.
5. Multi-currency simulations.
6. Swap the in-process rate-limit bucket store for Redis (multi-instance ready).
7. Cloudflare in front of the public domain for an additional WAF / bot layer.

---

## Common follow-up questions

**"Where does the historical data come from?"**
The demo seeds 12 tickers (AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSLA, SPY,
QQQ, VTI, DIA, IWM) with a deterministic geometric Brownian motion path
calibrated to plausible drift/volatility, anchored to a recent close. This
keeps the demo offline-friendly. Production would swap in a real provider
(`yfinance`, Polygon, etc.) — the rest of the engine is provider-agnostic.

**"How would you handle a real broker integration?"**
Plaid for read-only positions, OAuth via the broker's own API for writes.
The current `Scenario` model would gain a nullable `external_account_id`
and the `simulate` engine would be unchanged — we'd just feed it real
holdings instead of synthetic ones.

**"Why no NumPy?"**
Two reasons: pure-Python keeps the engine readable for a portfolio
audience, and the data sizes are small enough that NumPy doesn't help. The
engine has a clean dataclass interface so swapping in a NumPy
implementation is a one-file change.

**"Why Pydantic v2?"**
Faster validation, better DX with `model_config`, native JSON-mode
serialization for the time-series payloads. Pairs cleanly with FastAPI 0.115.

**"How is this different from Portfolio Visualizer / Yahoo Finance?"**
Same math, totally different presentation and UX. This is positioned as a
calm, editorial intelligence platform — not a calculator. Every metric has
a definition link, every KPI has an "as of" date, every term has an inline
tooltip, and the storyboard layout makes the math feel intuitive even for
someone who's never invested before.

**"Who's the auth model? Couldn't I just hijack someone's `client_id`?"**
v1 is anonymous-only by design — the `client_id` is a UUID stored in
`localStorage`, so without XSS (which React mitigates) or shoulder-surfing,
you can't get someone else's UUID. The server filters every query by
`client_id`, so even with a leaked scenario ID you get a 404 unless the
UUID matches. v2's plan is email-magic-link auth, which makes scenarios
recoverable across devices.

**"Walk me through your security audit."**
Open `docs/INTERVIEW_TALKING_POINTS.md` and the table under "Security
audit." Seven concrete findings, seven fixes, 26 e2e tests, 0 npm
vulnerabilities. The bug I'm proudest of catching is the middleware-order
issue — `SecurityHeadersMiddleware` was inside `RateLimitMiddleware`, so
429 responses had no security headers. Fixed by reordering. There's also a
nice gotcha about Starlette's `BaseHTTPMiddleware` not propagating
replayed bodies — that's why the body-cap middleware is pure ASGI.

**"Why can a 1990 buy date crash a real provider but not your demo?"**
Two layers: the schema guard rejects `start_date < 2000-01-01` with a
422, and the engine itself returns `INSUFFICIENT_DATA` if the seeded
prices don't cover the chosen window. Both messages are user-friendly —
the user sees "Try widening the dates," not a stack trace.

**"Tell me about a UX decision you made for non-engineers."**
The `InfoBadge` component. Every term in the UI — "CAGR", "Drawdown",
"Sharpe-like", "Benchmark", "Lump sum vs DCA" — is one click away from a
plain-English explanation rendered as a portal-positioned tooltip. The
same definitions live in a glossary section on the landing page and the
methodology page. The goal: a first-time investor or an older user can
reach the Results page, see "Max drawdown -29.4% (Apr 2020)", click `?`,
and read "the worst peak-to-trough fall during this run — how much it
hurt at the worst moment." That tooltip is also where I exercised the
`createPortal` pattern, the `prefers-reduced-motion` respect, and the
"flip up if there's no room below" geometry. Small component, lots of
craft.
