<div align="center">

# Historical Trade Scenario Simulator

> Replay any investment decision against real historical price data — with the
> calm precision of a fintech terminal, not the noise of a trading app.

[![Frontend: Vite + React + TS](https://img.shields.io/badge/Frontend-Vite%20%2B%20React%20%2B%20TS-3D6CFF?style=flat&labelColor=0E1424)](frontend/)
[![Backend: FastAPI + Postgres](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Postgres-A78BFA?style=flat&labelColor=0E1424)](backend/)
[![Design: UI%2FUX Pro Max](https://img.shields.io/badge/Design-UI%2FUX%20Pro%20Max-F4C770?style=flat&labelColor=0E1424)](design-system/historical-trade-scenario-simulator/MASTER.md)
[![Tests: 76 passing](https://img.shields.io/badge/Tests-76%20passing-5EE2A0?style=flat&labelColor=0E1424)](backend/tests/)

</div>

---

## What it does

Pick a ticker (or a basket), a buy date, an end date, and an investment policy
(lump sum, dollar-cost averaging, or both). The app renders a storyboard-style
results dashboard with:

- Final value, total return, CAGR, volatility, max drawdown, Sharpe-like ratio
- Growth-over-time chart with benchmark overlay (SPY / QQQ / others)
- Drawdown chart and per-year return bars
- Trade ledger of every buy event
- Save / duplicate / compare scenarios

The product is positioned as a **premium investment intelligence platform**:
editorial dark glass UI, premium typographic hierarchy, calm motion, and a
methodology page that explains every metric in plain English.

## Built for non-finance users too

Everything is explained twice — once for the analyst, once for "the normal
person." The landing page opens with a one-sentence "what is this?" callout, a
three-step "how it works", and an 8-term plain-English glossary. Every form
field, KPI, and chart has an inline `?` info badge that opens a portal-rendered
tooltip with a definition and a "why it matters" line. The methodology page
mirrors the same glossary. Older users and first-time investors should never
feel overwhelmed.

## Stack

| Layer       | Tech                                                                                  |
| ----------- | ------------------------------------------------------------------------------------- |
| Frontend    | Vite, React 18, TypeScript, Tailwind 3, Framer Motion 11, Recharts 2, Lucide          |
| Backend     | Python 3.11, FastAPI, SQLAlchemy 2 (async), Pydantic v2, Alembic                       |
| Database    | PostgreSQL 16 (Neon / Koyeb-managed)                                                   |
| Hosting     | Vercel (frontend), Koyeb (backend), Neon (database)                                    |
| Design      | Persisted design system at `design-system/historical-trade-scenario-simulator/`        |

## Repository layout

```
.
├── PRD.md                              # Full product requirements document
├── README.md                           # You are here
├── DEPLOYMENT.md                       # Step-by-step Vercel + Koyeb + Neon guide
├── docs/
│   └── INTERVIEW_TALKING_POINTS.md     # 60-second pitch + technical narrative
├── design-system/                      # UI/UX Pro Max output (master + page overrides)
├── backend/
│   ├── app/
│   │   ├── api/v1/                     # Versioned routes (securities, scenarios, simulate, …)
│   │   ├── core/                       # config, errors, logging, security middleware
│   │   ├── services/                   # finance engine + simulator orchestration
│   │   ├── models/                     # SQLAlchemy ORM
│   │   └── schemas/                    # Pydantic request/response shapes
│   ├── alembic/                        # Database migrations (incl. TTL run_at index)
│   ├── scripts/
│   │   ├── seed.py                     # Seed historical prices + sample scenarios
│   │   ├── cleanup.py                  # Manual / cron-friendly TTL cleanup CLI
│   │   └── refresh_prices.py           # Manual / cron-friendly market-data refresh CLI
│   ├── tests/
│   │   ├── test_finance.py             # 18 unit tests for the engine
│   │   ├── test_security.py            # 26 e2e tests for hardening (rate limit, headers, IDOR…)
│   │   ├── test_maintenance.py         # 10 tests for the storage TTL job + auth contract
│   │   └── test_marketdata.py          # 22 tests for the Tiingo + Yahoo + fetcher chain
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/                        # Routes, layout shell, mobile drawer
    │   ├── features/                   # builder, results, scenarios, compare, methodology
    │   │   └── landing/                # Hero, HowItWorks, PlainEnglishExplainer, Glossary…
    │   ├── components/
    │   │   ├── feedback/InfoBadge.tsx  # Portal-rendered "?" tooltip used everywhere
    │   │   ├── form/TickerPicker.tsx   # Portal-rendered, overflow-safe combobox
    │   │   └── …                       # Card, KPI, Chart, Form, Button, …
    │   ├── lib/                        # api client, hooks, formatters, motion
    │   ├── styles/                     # Design tokens, base CSS
    │   └── i18n/en.ts                  # Centralized UI copy + plain-English explanations
    ├── index.html
    ├── package.json
    └── vite.config.ts
.github/
└── workflows/cleanup.yml              # Daily cron → POST /api/v1/maintenance/cleanup
```

## Quick start (local)

```bash
# 1) Backend
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env                 # ships with SQLite by default — no Postgres needed
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload --port 8000

# 2) Frontend (in a second terminal)
cd frontend
npm install
cp .env.example .env                 # VITE_API_BASE_URL=http://localhost:8000
npm run dev                          # http://localhost:5173
```

The app ships with **seeded historical prices for AAPL, MSFT, NVDA, GOOGL,
AMZN, META, TSLA, SPY, QQQ, VTI, DIA, IWM** (2010–2026), plus three demo
scenarios so the UI looks rich on first load.

## Tests

```bash
cd backend && pytest -q
# 50 passed in ~1.5s
```

Three suites live under `backend/tests/`:

- **`test_finance.py` (14)** — deterministic unit tests for the finance engine
  (total return, CAGR, volatility, drawdown, Sharpe-like, annual returns,
  forward-fill, recurring cadence, lump-sum, DCA, basket weight normalization).
- **`test_security.py` (26)** — end-to-end hardening tests against a live
  TestClient: client-id format validation, body-size cap, schema guards (date
  range, amount caps, symbol regex, basket weights, duplicates, max positions),
  rate limiting (global + heavy-endpoint buckets), security response headers,
  error-envelope shape, CORS posture.
- **`test_maintenance.py` (10)** — storage TTL service + admin route. Service
  layer asserts cleanup deletes only stale rows, leaves the parent scenario
  untouched, is idempotent, and rejects bad inputs. API layer asserts the
  bearer-token contract: 401 without/with-wrong token, 200 with the right
  token, 503 when unconfigured, security headers on errors, and that the
  endpoint does not require the per-user `X-Client-Id` header.

Frontend type-checks with `npx tsc --noEmit` and builds with `npm run build`
(both green in CI).

## Security & abuse protection

The backend ships with defense-in-depth middleware (see
[`backend/app/core/security.py`](backend/app/core/security.py)):

| Guard                              | Default            | Configurable via                  |
| ---------------------------------- | ------------------ | --------------------------------- |
| Per-IP global rate limit           | 120 req / min      | `RATE_LIMIT_PER_MINUTE`           |
| Per-IP heavy-endpoint rate limit   | 20 req / min       | `HEAVY_RATE_LIMIT_PER_MINUTE`     |
| Request body size cap              | 64 KB              | `MAX_BODY_BYTES`                  |
| Per-client saved-scenario cap      | 100                | `MAX_SCENARIOS_PER_CLIENT`        |
| `X-Client-Id` format               | `^[A-Fa-f0-9\-]{16,64}$` | (compile-time)                |
| `X-Forwarded-For` trust            | off                | `TRUST_PROXY`                     |
| `scenario_results` TTL             | 30 days            | `RESULT_RETENTION_DAYS`           |
| `/maintenance/cleanup` bearer auth | required           | `MAINTENANCE_TOKEN`               |

Every response carries `X-Content-Type-Options: nosniff`, `X-Frame-Options:
DENY`, a `Referrer-Policy`, a hardened `Permissions-Policy`, COOP/CORP, and
`Cache-Control: no-store` on `/api/*`. Production additionally emits HSTS.
Errors use a single `{"error": {"code", "message", "field"}}` envelope and
**never** echo user input back. See `INTERVIEW_TALKING_POINTS.md` for the
full audit + remediation table.

## Real market data (Tiingo → Yahoo → synthetic)

Prices come from a **tiered fallback chain** so the simulator never breaks,
even when individual data providers go down:

1. **Tiingo** (primary, requires free API key — sign up at
   [tiingo.com](https://www.tiingo.com/account/api/token)). Split- and
   dividend-adjusted closes, 1,000 req/day on the free tier. ~80× our actual
   usage of 12 daily refresh calls.
2. **Yahoo Finance chart endpoint** (no key, no signup). What `yfinance`
   scrapes, but at the more stable `query1.finance.yahoo.com/v8/finance/chart`
   route. Adjusted closes, real volumes, 16+ years of history.
3. **Synthetic GBM** (always-on terminator). Deterministic Brownian motion
   calibrated to each ticker's historical (μ, σ), anchored to a realistic
   recent close. Used only when both networks above fail — the project
   literally cannot fail to boot.

The orchestrator (`app/services/marketdata/fetcher.py`) walks the chain in
order: first non-empty wins; unavailable / transient / parser errors fall
through to the next tier; logs at every step. Each provider is a thin async
client tested with `httpx.MockTransport` (offline, deterministic).

The daily GitHub Actions cron also hits
`POST /api/v1/maintenance/refresh-prices` once a day to append the latest
close per ticker. Per-symbol failures are reported in the 200 response body
rather than 500'ing the whole run.

To **add a stock**: append one entry to `SECURITIES` in
[`backend/app/services/seed/data.py`](backend/app/services/seed/data.py),
commit, push. The next deploy auto-fetches its history. To **upgrade an
existing deploy from synthetic to real data**, set `MARKETDATA_FORCE_REFRESH=true`
on Koyeb once, redeploy, then unset.

## Storage TTL (daily cron)

Saved scenarios are kept forever — the user can re-run them at any time. The
heavy result *payload* (a dense JSON time series per run) is the only thing
that grows, so it expires after **30 days** by default. A daily GitHub
Actions workflow (`.github/workflows/cleanup.yml`) `POST`s to
`POST /api/v1/maintenance/cleanup` with a bearer token (`MAINTENANCE_TOKEN`),
which calls `cleanup_old_results(retention_days=RESULT_RETENTION_DAYS)`. The
endpoint is hard-disabled (503) when the token is unset, so a misconfigured
deploy can't be invoked anonymously. See `DEPLOYMENT.md § 2b` for the
end-to-end setup, or `python scripts/cleanup.py --dry-run` to preview.

## Runs forever, with zero ops

Every layer is designed so that, once deployed, the project requires **no
scheduled maintenance** indefinitely:

- **Daily cleanup cron** prunes the DB, keeps Koyeb warm (defeats free-tier
  scale-to-zero) and Neon awake (defeats ~14-day idle auto-suspend).
- **Heartbeat commit** to `.github/last-cleanup.txt` runs alongside cleanup —
  defeats GitHub's 60-day "schedule auto-disable" rule that silently kills
  unattended `schedule:` workflows.
- **Failure-watch job** opens **one** issue (label `cron-alert`) after 3
  consecutive cron failures. Not 30. One.
- **Dependabot** opens grouped weekly PRs for security/patch updates so the
  dependency tree doesn't rot. We deliberately don't auto-merge — PRs sit
  harmlessly until you choose to look.
- **Vercel + Koyeb** auto-renew SSL; **`vercel.app`** + **`koyeb.app`**
  domains never expire; FastAPI **auto-restarts on crash**.
- **In-process rate limiter** uses LRU eviction so memory is bounded.

Things that ARE on you (rare, qualitative): rotating `MAINTENANCE_TOKEN`,
changing your Vercel/Koyeb domain, refreshing the seeded prices when the
historical dataset ages out. Full matrix in
[`DEPLOYMENT.md § 3b`](DEPLOYMENT.md#3b-forever-mode-operations).

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full Vercel + Koyeb + Neon walkthrough.

## Design system

The visual language is documented in
[`design-system/historical-trade-scenario-simulator/MASTER.md`](design-system/historical-trade-scenario-simulator/MASTER.md)
with per-page overrides under `pages/`. Highlights:

- Editorial dark glass on a midnight canvas (`#070B14`)
- Cobalt brand + Aurum gold accent + Lavender benchmark
- Fraunces (display) · Inter (UI) · JetBrains Mono (numerals, tabular)
- Framer Motion with a custom premium ease `[0.22, 0.61, 0.36, 1]`
- Strict anti-patterns: no glass-on-glass, no neon gradients, no 3D charts
- Mobile-friendly: hamburger drawer below `lg`, portal-rendered popovers escape
  parent `overflow:hidden`, responsive padding/typography across all pages

## Methodology

Every metric is explained at `/methodology`. Math lives in
`backend/app/services/finance/` and is unit-tested with deterministic fixtures
in `backend/tests/test_finance.py`. The page also surfaces a plain-English
glossary so a non-finance reader can find every term in one place.

## What was hard / interview talking points

- **Forward-fill on holidays.** Picking a Saturday or a market-closed day must
  not crash the simulation. The engine snaps to the next valid trading day,
  capped at 7 calendar days.
- **DCA + basket together.** Recurring contributions split pro-rata across
  basket weights, allocated at each cadence's nearest valid trading day.
- **Drawdown without overcounting.** The peak series is computed as the running
  max; drawdown is `(value − peak) / peak`. Trough date is captured for the UX.
- **Benchmark normalization.** Both portfolio and benchmark series are rebased
  to $1 for a clean comparison overlay.
- **Designing the dashboard as a storyboard.** The Results page reads top-to-
  bottom rather than as a wall of widgets. KPIs, then growth, then drawdown
  and annual returns, then breakdown, then trade ledger, then disclaimer.
- **Portal-based dropdowns.** The ticker picker and every info tooltip render
  via `createPortal` to `document.body` with computed `fixed` positioning, so
  they can never be clipped by an `overflow:hidden` accordion or animated
  parent. The popover auto-flips above the trigger when there's no room below.
- **Body-cap middleware that doesn't eat the body.** I started with
  `BaseHTTPMiddleware` for the request-size cap and caught a downstream bug
  where Starlette doesn't propagate replayed bodies across the
  middleware boundary. Rewrote as pure ASGI — collects every `http.request`
  message, then replays them in order to the route handler.
- **A real security audit.** Mapped every route, found 7 concrete attack
  vectors (no rate limit, unbounded body, weak client-id format, unbounded
  date range, no security headers, no per-client cap, generic 500 leaks),
  patched each one, and added 26 e2e tests so the guards stay nailed down.
- **Storage TTL the boring way.** Free-tier Postgres is small. Rather than
  ship an in-process scheduler (which Koyeb's free tier would silently miss
  every time the container scales to zero), I exposed a bearer-token-protected
  admin route and let an external scheduler — GitHub Actions, in our case —
  call it once a day. That decision lets the cron itself wake the service,
  is fully observable in the Actions log, and works with zero extra
  infrastructure even on multi-replica deploys. Saved scenarios stay forever;
  only the heavy JSON payload expires.
- **"Run forever" requires defeating GitHub's 60-day idle rule.** Easy to
  miss: GitHub auto-disables `schedule:` workflows whenever the *repository*
  itself goes 60 days without commits — and workflow runs don't count as
  activity. So I made the cron commit a heartbeat file (`[skip ci]`) back to
  `main` on every run. Repo never goes idle ⇒ schedule never disables ⇒ the
  project genuinely runs forever on free tiers without operator input.
  Rounded out with a one-issue-per-streak failure watcher so I get exactly
  one alert (not 30) when something does break.
- **Resilient market data via a 3-tier fallback chain.** Real historical
  prices are non-negotiable for portfolio credibility, but every free
  provider eventually rate-limits, paywall-pivots, or breaks their schema.
  My first design used Stooq as a no-auth fallback; days into rollout
  Stooq put their CSV endpoint behind a captcha-acquired API key. The
  tiered design absorbed it cleanly: I dropped a `yahoo.py` implementing
  the same `PriceProvider` Protocol and the orchestrator picked it up
  with a one-line change. Tiingo → Yahoo → synthetic GBM: real adjusted
  closes when both networks work, deterministic-but-plausible series
  when they don't. 22 tests pin the contract with `httpx.MockTransport`.

For interview-grade depth on each of these, see
[`docs/INTERVIEW_TALKING_POINTS.md`](docs/INTERVIEW_TALKING_POINTS.md).

## License

MIT — see [LICENSE](LICENSE).

> Educational only. **Not investment advice.**
