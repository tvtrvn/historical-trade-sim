# Deployment Guide

This project is designed to run in three free or near-free services:

| Layer       | Service                | Cost              |
| ----------- | ---------------------- | ----------------- |
| Database    | [Neon](https://neon.tech)  | Free tier        |
| Backend     | [Koyeb](https://www.koyeb.com) | Free tier (2 services) |
| Frontend    | [Vercel](https://vercel.com)  | Free hobby tier   |

End-to-end deployment takes roughly 20–30 minutes the first time.

---

## 1. Database — Neon

1. Sign up at https://neon.tech and create a new project.
2. Choose Postgres 16, the region closest to your Koyeb region.
3. From the project dashboard, open **Connection Details** → choose **Pooled connection** and copy the **`asyncpg`** flavored URL. It looks like:

   ```
   postgresql://user:password@ep-xxxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. Convert it into the SQLAlchemy async form by inserting `+asyncpg` after `postgresql`:

   ```
   postgresql+asyncpg://user:password@ep-xxxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

5. (Recommended) Create a second branch on Neon called `dev` for local testing.

---

## 2. Backend — Koyeb

1. Push this repository to GitHub.
2. Sign up at https://www.koyeb.com and click **Create app → GitHub**.
3. Pick the repository, set the **work directory** to `backend/`.
4. Builder: **Dockerfile** (it's already at `backend/Dockerfile`).
5. **Service settings:**
   - Type: **Web service**
   - Internal port: `8000`
   - Health check: `GET /health`
   - Region: closest to your users
   - Instance: Free `nano`
6. **Environment variables** (full list and inline guidance in
   [`backend/.env.example`](backend/.env.example)):

   | Key                              | Recommended value                                                  | Notes                                                |
   | -------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
   | `DATABASE_URL`                   | Neon URL with the `+asyncpg` driver from step 1                    | required                                             |
   | `CORS_ALLOW_ORIGINS`             | Your Vercel URL, e.g. `https://historical-trade-sim.vercel.app`    | comma-separated. **Never use `*`.**                  |
   | `ENV`                            | `production`                                                       | enables HSTS, hides `/docs`, tightens logs.          |
   | `RATE_LIMIT_PER_MINUTE`          | `120`                                                              | per-IP global rate limit                             |
   | `HEAVY_RATE_LIMIT_PER_MINUTE`    | `20`                                                               | per-IP bucket for `/simulate` + scenario mutations   |
   | `MAX_BODY_BYTES`                 | `65536`                                                            | hard cap on request body size                        |
   | `MAX_SCENARIOS_PER_CLIENT`       | `100`                                                              | per-client storage cap (anti-spam)                   |
   | `TRUST_PROXY`                    | `true`                                                             | Koyeb terminates TLS at the edge and forwards `X-Forwarded-For`; turning this on lets the rate limiter see the real client IP. **Only enable behind a trusted proxy.** |
   | `RESULT_RETENTION_DAYS`          | `30`                                                               | TTL for `scenario_results`. Saved scenarios are kept forever; only the heavy result payload expires. |
   | `MAINTENANCE_TOKEN`              | `openssl rand -hex 32` output                                      | Bearer token for `POST /api/v1/maintenance/{cleanup,refresh-prices}`. Empty = endpoints disabled. **Use the same value as the GitHub repo secret** so the daily cron can authenticate. |
   | `TIINGO_API_KEY`                 | free key from [tiingo.com](https://www.tiingo.com/account/api/token) — *optional* | When set, the market-data fetcher tries Tiingo first for split/dividend-adjusted closes. Empty → falls back to Yahoo Finance (still real, no key required). |
   | `MARKETDATA_FORCE_REFRESH`       | `false` (set to `true` once to wipe + repopulate)                  | Toggle to upgrade an existing deploy from synthetic to real data: set `true`, redeploy, set back to `false`. |

7. Deploy. The first deploy will:
   - Run `alembic upgrade head` (creates the schema).
   - Run `python scripts/seed.py --skip-if-seeded` (idempotent seeding).
   - Start `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

8. After deploy, test:

   ```bash
   curl https://<your-app>.koyeb.app/health
   curl https://<your-app>.koyeb.app/api/v1/securities
   ```

> **Note on free tier cold starts.** Koyeb's free tier sleeps idle services. The
> frontend's skeleton states keep the UX calm during the ~3s cold start; the
> first real request after a long idle may take a beat.

---

## 2b. Storage TTL — daily cleanup cron

Free-tier Postgres is small (Neon's free plan = 0.5 GB) and each saved
simulation persists a dense JSON time series in `scenario_results.payload`.
To keep the database from growing forever we delete result rows older than
`RESULT_RETENTION_DAYS` (default **30 days**) once a day. **Saved scenarios
themselves are never deleted** — the user can re-run any of them at any time
to regenerate fresh metrics.

The cron is a simple authenticated HTTP call. It's fully external so it
works even when Koyeb's free tier scales the container to zero (the call
itself wakes the service up).

### Step 1 — generate a token

```bash
openssl rand -hex 32
```

### Step 2 — set it as a Koyeb env var

In the Koyeb service env-vars panel, add:

```
MAINTENANCE_TOKEN=<the value from step 1>
```

Redeploy. (You can confirm the endpoint is wired by `curl`-ing it without
the header — you should get `401 UNAUTHORIZED`.)

### Step 3 — wire up GitHub Actions

The repo ships `.github/workflows/cleanup.yml`, which runs once a day at
03:17 UTC and `POST`s to `/api/v1/maintenance/cleanup`. To enable it:

1. **GitHub → Repo → Settings → Secrets and variables → Actions → Variables → New variable:**
   - Name: `BACKEND_URL`
   - Value: e.g. `https://api.your-app.koyeb.app`
2. **…→ Secrets → New repository secret:**
   - Name: `MAINTENANCE_TOKEN`
   - Value: the same value you put in Koyeb.
3. Open the **Actions** tab → "TTL cleanup" → **Run workflow** to fire it
   manually once and confirm it returns `200 OK` with a JSON report.

The job retries with backoff (3 attempts), prints the deleted-row count to
the run summary, and times out at 5 minutes.

### Alternatives

- **Any external scheduler works.** cron-job.org, UptimeRobot's keyword
  monitor, EasyCron, etc. — they all need to send `POST` with
  `Authorization: Bearer <MAINTENANCE_TOKEN>`.
- **No external scheduler? Run it locally.** `python scripts/cleanup.py`
  (add `--dry-run` first, then `--days N` to override the retention).
  Suitable for a host-level cron / systemd timer if you self-host.

### Tuning the retention window

Change `RESULT_RETENTION_DAYS` in the Koyeb env panel and redeploy. The
range is 1–3650; `30` is the default. Shorter = smaller DB but users see
more "Re-run" prompts on old scenarios; longer = more storage.

---

## 2c. Market data — Tiingo → Yahoo → synthetic

Prices come from a tiered fallback chain (`backend/app/services/marketdata/`).
You get **real adjusted closes** with zero ongoing effort.

### How the chain works

1. **Tiingo** is tried first if `TIINGO_API_KEY` is set. Split- and
   dividend-adjusted closes, 1,000 free requests/day, ~80× our actual usage.
   Sign up: [tiingo.com](https://www.tiingo.com/account/api/token) (free,
   no credit card).
2. **Yahoo Finance chart endpoint** is the no-key fallback. No signup.
   What `yfinance` scrapes, just at a more stable URL. Adjusted closes
   covering 16+ years.
3. **Synthetic GBM** is the always-on terminator. Deterministic Brownian
   motion calibrated to each ticker's μ/σ, anchored to a realistic recent
   close. Used only when both networks above fail.

**Recommended:** set `TIINGO_API_KEY` in Koyeb for production-grade
adjusted prices. The app works fine without it (Yahoo handles real data
just as well day-to-day), but Tiingo's data team explicitly QAs splits
and dividends, so it's a strictly better signal on edge-case tickers.

### Upgrading an existing deploy from synthetic to real data

If your Koyeb DB was already seeded with synthetic prices (pre-marketdata),
flip the wipe-and-repopulate flag:

1. In Koyeb env vars: set `MARKETDATA_FORCE_REFRESH=true`.
2. **Redeploy.** The seeder logs `MARKETDATA_FORCE_REFRESH=true — wiping
   existing prices for AAPL` for each ticker, then fetches fresh data.
3. Once the deploy goes healthy (~30 s for all 12 tickers), set
   `MARKETDATA_FORCE_REFRESH=false` (or just remove the env var). The
   refresh in steady state is **incremental** — only today's close gets
   pulled each day.

### Daily refresh cron

The same daily workflow that runs cleanup also calls
`POST /api/v1/maintenance/refresh-prices` first, which appends the new
day's close per ticker. Per-symbol failures are reported in the 200 body
rather than 500-ing the entire job — one bad ticker can't break the run.

### Adding a new stock

Append a `TickerSpec(symbol, name, exchange, asset_class, logo_url, μ, σ, anchor_price)`
to `SECURITIES` in `backend/app/services/seed/data.py`, commit, push. On
next Koyeb deploy the seeder detects the new symbol, fetches its history
from the active provider, and adds it. The μ/σ/anchor numbers are only
used by the synthetic fallback — they don't affect real-data accuracy.

---

## 3. Frontend — Vercel

1. Push this repository to GitHub (same one as the backend).
2. Sign up at https://vercel.com → **Add New… → Project** → select the repo.
3. Configure:
   - **Root directory:** `frontend`
   - **Framework preset:** Vite (auto-detected)
   - **Build command:** `npm run build` (default)
   - **Output directory:** `dist` (default)
4. **Environment variable:**

   | Key                  | Value                              |
   | -------------------- | ---------------------------------- |
   | `VITE_API_BASE_URL`  | Your Koyeb backend URL from step 2 |

5. Click **Deploy**.

6. After deploy, open the URL — you should see the landing page with the floating scenario card animating in.

---

## 3b. Forever-mode operations

This project is designed to run **indefinitely with zero scheduled
maintenance** on free tiers. The mechanisms are layered:

| Risk that could need your attention                         | Mitigation                                                      | Action you take |
| ----------------------------------------------------------- | --------------------------------------------------------------- | :-------------: |
| `scenario_results` grows forever                            | Daily TTL cron deletes rows > `RESULT_RETENTION_DAYS`            | none            |
| Koyeb scales container to zero (free tier)                  | Daily cron `POST` wakes it; Koyeb auto-restarts on crash         | none            |
| Neon auto-suspends idle projects after ~14 days             | Daily cron's DB call counts as activity                          | none            |
| **GitHub auto-disables `schedule:` after 60 days idle**     | Daily heartbeat commit (`.github/last-cleanup.txt`) keeps repo "active" | none    |
| Cleanup workflow fails silently for days                    | Job opens **one** issue (label `cron-alert`) after 3 consecutive failures | close issue once you fix it |
| Security CVEs in pip / npm deps                             | Dependabot (`.github/dependabot.yml`) opens grouped weekly PRs   | merge when convenient (or never; app keeps running) |
| Vercel domain / SSL renewal                                 | Vercel manages both                                              | none            |
| Koyeb domain / SSL renewal                                  | Koyeb manages both                                               | none            |
| MAINTENANCE_TOKEN compromise                                | Token is 256-bit random; rotate only if you suspect a leak       | none            |
| GitHub Actions free-minute quota (2000/mo)                  | Daily run is ~1 min ⇒ ~30 min/mo, ~1.5% of the quota             | none            |

### How "forever" actually works

The daily `cleanup.yml` workflow does **three** jobs in one tick, all linked
together:

1. **Cleanup** — `POST /api/v1/maintenance/cleanup` with the bearer token.
   - Touches the DB ⇒ Neon stays awake.
   - Touches the API ⇒ Koyeb stays awake.
   - Deletes expired result payloads ⇒ free-tier storage stays small.
2. **Heartbeat** — commits `.github/last-cleanup.txt` (with a `[skip ci]`
   tag) back to `main`. The commit itself is what GitHub's 60-day-idle timer
   counts as "repo activity"; without it the schedule auto-disables and the
   above two stop firing. Heartbeats run on success **and** failure so a
   transient outage can't kill the cron.
3. **Failure-watch** — only runs when the cleanup step failed. It walks the
   recent heartbeat commits, counts `outcome: failure` entries, and opens
   **one** GitHub issue (label `cron-alert`) when the streak hits 3. Subsequent
   failures don't reopen or comment — you get one ping, not 30.

### What happens when…

- **You go on vacation for a year.** The cron fires daily, prunes the DB,
  keeps both free-tier services awake, and commits a heartbeat. The repo
  never goes idle. Dependabot quietly opens ~50 PRs you can review or close.
- **Koyeb is down for a few hours.** The cron retries 3× with backoff and
  gracefully gives up. The heartbeat still commits with `outcome: failure`.
  You get a "workflow failed" email. If Koyeb is down for 3+ days the cron
  opens an issue. Once Koyeb recovers, the next day's run succeeds and life
  continues.
- **Neon archives the project.** The DB call wakes it up automatically.
  Re-archival happens only after another ~14-day idle period — which the
  daily cron prevents.
- **A CVE is published against `aiohttp`.** Dependabot opens a security PR
  within a day. You get a notification; you can review and merge whenever.
  The app keeps running on the old version until you do.
- **You forget to look for 6 months.** Open `Actions` → confirm green ticks
  daily. Open `.github/last-cleanup.txt` on `main` → see the most recent
  timestamp. That's it.

### What WOULD eventually require you

These are not solved by the cron because they're qualitative changes only
you can authorize. None require regular cadence:

| Thing | When you'd notice | What to do |
| ----- | ----------------- | ---------- |
| Seed data ends in 2026 | Scenarios with end dates near "today" return `INSUFFICIENT_DATA` after we cross 2026 | Re-seed with newer prices via your preferred data source, or rotate the seed. The infra still works; the dataset is just stale. |
| You change the Vercel domain | CORS preflight fails from the new origin | Update `CORS_ALLOW_ORIGINS` in Koyeb. |
| You move backend to a new Koyeb URL | Cron + frontend break together | Update GitHub variable `BACKEND_URL` and Vercel env `VITE_API_BASE_URL`. |
| You rotate `MAINTENANCE_TOKEN` | Cron starts returning 401 | Update both Koyeb env var and GitHub secret. The auto-issue will already explain this. |

---

## 4. Smoke checklist (post-deploy)

### Functional
- [ ] `GET /health` returns `200 {"status":"ok"}`.
- [ ] `GET /api/v1/securities` returns ≥ 12 rows.
- [ ] Landing page LCP ≤ 2.0s on a throttled 4G run.
- [ ] Click "Run a sample scenario" → Results page renders with animated KPIs.
- [ ] Build a custom scenario → save → it appears in Saved scenarios.
- [ ] Compare two saved scenarios → both lines render in sync.
- [ ] Open `/methodology` → all 6 sections + glossary render with anchor links.
- [ ] Open dev tools console — zero errors on each route.

### Mobile
- [ ] Resize to ~375px wide (or open on a phone). Hamburger button appears top-right.
- [ ] Tap the hamburger → drawer slides in with all routes + "New scenario" CTA.
- [ ] In Builder, tap a ticker — picker dropdown is fully visible (not clipped).
- [ ] Tap any `?` info badge — tooltip renders without overflow issues.

### Security (defense-in-depth)
- [ ] `curl -I https://<api>/api/v1/methodology` — confirm the response carries
      `x-content-type-options: nosniff`, `x-frame-options: DENY`,
      `referrer-policy`, `permissions-policy`, `cache-control: no-store`,
      and (in production only) `strict-transport-security`.
- [ ] `curl -H "X-Client-Id: hi" https://<api>/api/v1/scenarios` returns 422
      `INVALID_INPUT`.
- [ ] `curl --data-binary @100k.json -H "Content-Type: application/json" \
      -X POST https://<api>/api/v1/simulate` returns 413 `PAYLOAD_TOO_LARGE`.
- [ ] Hammer `/api/v1/simulate` >20×/min from a single IP → 429 `RATE_LIMITED`
      with a `Retry-After` header.
- [ ] `curl -H "Origin: https://evil.example" -X OPTIONS …` does **not**
      echo `evil.example` in `Access-Control-Allow-Origin`.

### TTL cleanup
- [ ] `curl -X POST https://<api>/api/v1/maintenance/cleanup` returns 401
      `UNAUTHORIZED` (no token).
- [ ] `curl -X POST -H "Authorization: Bearer wrong" …/maintenance/cleanup`
      also returns 401.
- [ ] `curl -X POST -H "Authorization: Bearer $MAINTENANCE_TOKEN" \
      …/maintenance/cleanup` returns 200 with JSON
      `{retention_days, cutoff, candidates, deleted_results}`.
- [ ] In the GitHub repo's **Actions** tab, manually run the "TTL cleanup"
      workflow once — it should finish green within ~10s.

---

## 5. Local development

See [`README.md`](README.md) for the local setup. The TL;DR:

```bash
# Terminal 1 — backend
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
npm run dev   # http://localhost:5173
```

The default `.env` ships SQLite for the backend (no Postgres needed locally).

---

## 6. Troubleshooting

### `MissingGreenlet` from SQLAlchemy

The async engine needs the `greenlet` dependency. The Dockerfile installs it
explicitly, and `pyproject.toml` lists it. If you see this error locally, run
`pip install greenlet==3.1.1` inside your venv.

### CORS errors in the browser

`CORS_ALLOW_ORIGINS` on the backend must exactly match the frontend origin
(no trailing slash). In dev, set it to `http://localhost:5173`. Multiple
origins can be comma-separated.

### Cold-start timeouts

Free Koyeb instances sleep on idle. The first call after a long idle period
may need ~3s. The frontend's skeleton states absorb this gracefully.

### Postgres SSL required

Neon requires `?sslmode=require`. asyncpg understands this; do NOT strip it
from the URL.

### Alembic complains about an existing schema

If you re-deploy and the schema is already applied, that's fine —
`alembic upgrade head` is idempotent.

### Legitimate users hitting 429 `RATE_LIMITED`

The defaults (`120 / 20`) are safe for a portfolio demo. If you've shared the
URL in a class or onstage and lots of people are running simulations from
behind the same NAT, raise `RATE_LIMIT_PER_MINUTE` and
`HEAVY_RATE_LIMIT_PER_MINUTE` in Koyeb's env panel and redeploy. If you
horizontally scale the backend to >1 replica, replace the in-process token
bucket with a Redis-backed implementation — see the comment at the top of
`backend/app/core/security.py`.

### IP rate limiting always sees the same address

Koyeb's edge fronts your service. Make sure `TRUST_PROXY=true` is set so the
limiter reads `X-Forwarded-For` instead of the proxy IP. **Only** enable this
when you're sure your edge strips client-supplied `X-Forwarded-For` headers.

### `MAX_SCENARIOS_PER_CLIENT` blocking your own demo

If you're rerunning the demo a lot, you may bump the per-client cap (default
100). Either raise the env var or `DELETE` old scenarios via the UI.

### TTL cron returns 503 `MAINTENANCE_DISABLED`

`MAINTENANCE_TOKEN` is empty in the deployed env. Set it (and the matching
GitHub secret), then redeploy. The endpoint is intentionally hard-disabled
when no token is configured so a misconfigured deploy can't be invoked
anonymously.

### TTL cron returns 200 but `deleted_results` is always 0

That just means nothing has expired yet — the default retention is 30
days. To force a deletion on a fresh deploy, temporarily lower
`RESULT_RETENTION_DAYS` to `1`, run the workflow, then put it back. Or
use the CLI: `python scripts/cleanup.py --days 1`.

### TTL cron times out / Neon cold start

Neon's free tier scales to zero. The workflow retries 3× with 5s backoff
(`--retry-all-errors --retry-delay 5`) so a cold start is normally
absorbed. If you see persistent timeouts, raise the workflow's
`--max-time` value and check Neon's "compute activity" tab.

### "I want to wipe and re-seed"

Locally:

```bash
cd backend
rm local.db
alembic upgrade head
python scripts/seed.py
```

In production, recreate the Neon branch and re-deploy.
