# Situation X

## Overview

A full-stack AI + astrology powered situation analysis application. Users describe any situation and receive multi-dimensional analysis combining AI reasoning and astrological wisdom.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/situation-x)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **AI**: Groq (OpenAI-compatible API), default model llama-3.3-70b-versatile
- **Build**: esbuild (CJS bundle)

## Features

### Analysis Modules
- **Outcome**: Probability and success likelihood analysis
- **Astrology**: Current planetary influences and cosmic timing
- **Timing**: Optimal windows and periods to avoid
- **Compatibility**: Energy/entity compatibility assessment
- **Risk**: Key risks and mitigation strategies

### App Pages
- **Oracle** (`/`): Main analysis interface — select category, modules, enter situation, optional birth data
- **Past Readings** (`/history`): Browse all past analyses with filtering
- **Cosmic Stats** (`/stats`): Dashboard with outcome distribution, category breakdown, activity charts

### Design
- Dark cosmic theme: deep indigo/midnight blue with gold and violet accents
- Animated cosmic background effects
- Module verdict color coding: favorable=gold, unfavorable=rose, conditional=amber, neutral=silver
- Framer Motion animations throughout

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

### analyses
- `id` — serial primary key
- `situation` — the user's situation description
- `category` — one of: relationship, career, finance, health, personal, general
- `modules` — array of analysis modules used
- `overall_result` — YES/NO/CONDITIONAL/UNCERTAIN
- `overall_confidence` — low/medium/high
- `overall_score` — 0-100 numeric score
- `summary` — brief executive summary
- `full_analysis` — full JSON analysis result
- `created_at` — timestamp

## API Endpoints

All under `/api` prefix:
- `GET /healthz` — health check
- `POST /analysis/analyze` — run AI + astrology analysis
- `GET /analysis/history` — get paginated history
- `GET /analysis/history/:id` — get single analysis
- `DELETE /analysis/history/:id` — delete analysis
- `GET /analysis/stats` — aggregate statistics

## AI Integration

Uses Groq (https://api.groq.com/openai/v1) through plain `fetch` (`artifacts/api-server/src/lib/groq.ts`).
The AI works together with the Prashna astrology: it receives the AJIT/MANU/SIVI results and the
charts used, and returns a refined score, summary, astrological insight, advice and time frame.
- Env vars: `GROQ_API_KEY` (required for AI answers), optional `GROQ_MODEL` (default `llama-3.3-70b-versatile`),
  `GROQ_BASE_URL`, `GROQ_TIMEOUT_MS` (default 20000)
- Without `GROQ_API_KEY`, or if Groq fails or times out, the answer comes from the engine + astrology alone
  (`synthesis.source = "engine"`)

## Subscriptions, credits & payments (Razorpay, INR)
Prepaid, no auto-renewal. A **plan** (Monthly, 6 Months, 1 Year, 2 Years) gives access time, a discount that grows
with length, and **credits** (1 rupee = 1 credit: 150 / 850 / 1700 / 3400). Every analysis spends credits; when they run
out the user tops up. Price logic: `src/services/billing.service.ts` (integer paise, always computed on the server);
credits: `src/services/credits.service.ts`; what an analysis costs: `src/services/credit-cost.service.ts`.
Razorpay Orders API via `src/lib/razorpay.ts`; routes in `src/routes/billing.ts`; UI at `/pricing`.
- **Cost of one analysis** = ASTRO (4, always; +2 per extra Prashna chart D3/D9/D10) + AJIT (1, if the intent was
  recognised) + MANU (1, if an emotion was detected) + SIVI (2) + AI reasoning level (standard 4 / deep 8 / expert 14).
  The level is `auto` (from question length, risk, emotion intensity, health/conflict) or chosen by the user
  (`depth` in the request). `POST /api/analysis/estimate` returns the exact price before anything is charged.
  The price is debited up front, atomically (balance can never go below zero); if the AI cannot answer, the AI part
  is refunded and the user still gets the engine + astrology answer. A failed analysis is refunded in full.
- **Who can buy what:** plans (anyone), top-up packs of 100/300/1000 credits (active subscribers only, 1 rupee per
  credit), and "single query" credits (anyone, deliberately the highest price per credit) to push users to subscribe.
  `POST /api/billing/order` takes exactly one of `plan`, `pack`, `singleCredits`; never an amount.
- Flow: order -> Razorpay Checkout -> `POST /api/billing/verify` (HMAC check) delivers it. `POST /api/billing/webhook`
  is the backup (signature-verified). Both are idempotent: the payment flips `created -> paid` once, and credit grants
  are unique per (reason, order id) in `credit_ledger`.
- Tables `subscriptions`, `payments` (+ `kind`, `credits`), `credit_wallets`, `credit_ledger`: run
  `pnpm --filter @workspace/db run push` after deploying.
- Env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; credits are charged once the Razorpay keys are set
  (no keys = everything free, nothing debited; `BILLING_PAYWALL=on|off` forces it either way); `BILLING_FREE_USER_IDS` = Clerk ids that are never charged.
  Pricing: `BILLING_PLAN_PRICES_INR` (`150,850,1700,3400` for 1/6/12/24 months), `BILLING_GST_PCT` (0),
  `BILLING_CREDITS_PER_INR` (1 rupee = 1 credit), `BILLING_WELCOME_CREDITS` (20, one time per new user),
  `BILLING_TOPUP_RATE_INR` (1 per credit), `BILLING_SINGLE_RATE_INR` (2 per credit). Optional stronger models
  for the higher AI levels: `GROQ_MODEL_DEEP`, `GROQ_MODEL_EXPERT`.
- Razorpay dashboard webhook URL: `https://<your-domain>/api/billing/webhook`, events `payment.captured`
  and `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.

### Invite a friend (referral)
- Every user has an 8-character code and a link (`https://<site>/?ref=CODE`); the "Invite a friend" page (`/invite`)
  shows them with copy / share buttons and the counts. The link is remembered in the browser through sign-up and
  applied once right after sign-in (`POST /api/referral/redeem`); a code can also be typed on the Invite page.
- A code can be applied once per user, never to oneself, and only before that user's first payment.
- When the invited friend makes their first qualifying payment (>= `REFERRAL_MIN_PAYMENT_INR`, default 100), the
  person who invited them earns `REFERRAL_REWARD_PCT` (default 20) % off their NEXT purchase (plan, top-up or
  single-query credits). One friend = one discount; one discount is used per order, applied on the server in
  `POST /api/billing/order` (the order response shows `listPricePaise`, `referralDiscountPct`, `amountPaise`).
- A discount is held by an unpaid order for 2 hours and then becomes usable again; a failed order releases it at once.
- Tables `referral_codes`, `referrals`, `referral_rewards`: run `pnpm --filter @workspace/db run push` after deploying.

### Go-live checklist for payments
1. Razorpay dashboard -> API keys: set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the API server, restart. Nothing else
   changes in the code: the plans page switches from "payments opening soon" to live buying by itself
   (`paymentsConfigured` in `GET /api/billing/plans`).
2. Razorpay dashboard -> Webhooks: URL `https://<your-domain>/api/billing/webhook`, events `payment.captured` and `order.paid`,
   choose a secret and set the same value as `RAZORPAY_WEBHOOK_SECRET`. This confirms payments even if the customer closes the
   browser before returning.
3. Database tables: on Supabase open SQL Editor, paste the whole of `lib/db/supabase-setup.sql` and Run (safe to repeat; it keeps
   existing data and adds only what is missing). Elsewhere `pnpm --filter @workspace/db run push` does the same.
   `DATABASE_URL` = Supabase -> Connect -> connection string (the pooler one on port 6543 is fine). SSL is switched on
   automatically for Supabase hosts (`DATABASE_SSL=on|off` overrides).
4. Optional: `BILLING_WELCOME_CREDITS=0` (no free credits), `BILLING_FREE_USER_IDS=<your Clerk id>` (owner never charged),
   `BILLING_GST_PCT` once GST-registered.
5. The server logs a warning at start if credits are charged but the keys (or the webhook secret) are missing.

### Deploying on Render (one service: API + website)
- `render.yaml` defines a single Node web service. The build installs with pnpm (pinned by `packageManager` in the root
  `package.json`), builds the website (`artifacts/situation-x/dist/public`) and the API (`artifacts/api-server/dist`); the API
  server then also serves the website, so both share one address (no CORS, Clerk cookies just work). `FRONTEND_DIR` overrides
  where the built website is read from.
- Existing service created from the dashboard: Settings -> Build Command = the `buildCommand` of `render.yaml`, Start Command =
  `pnpm --filter @workspace/api-server run start`, Health Check Path = `/api/healthz`, plus the environment variables listed there.
  The old `cd backend && npm install ...` command belongs to the legacy `backend/` folder and fails in this pnpm workspace.
- `VITE_CLERK_PUBLISHABLE_KEY` is baked into the website at build time, so after changing it use "Manual Deploy -> Clear build cache & deploy".

### Installable app (PWA)
- The website can be installed like an app: Android / Windows (Chrome, Edge) show an "Install" button (`InstallPrompt`), iPhone Safari
  shows "Share -> Add to Home Screen". Files in `artifacts/situation-x/public/`: `manifest.webmanifest`, `sw.js`, `offline.html`,
  `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`; registered in `src/main.tsx` (production build only).
- Everything still runs on the server: the service worker only keeps the built `/assets/` files and shows an offline page. It never
  touches `/api/`, sign-in, AI or payment traffic.
- Caching: only `/assets/*` (hashed names) is cached for a year; `index.html`, `sw.js`, the manifest and icons are always revalidated
  (`artifacts/api-server/src/app.ts`), so an update reaches users on their next visit.
- To change the app icon, replace the PNGs (192, 512, maskable 512 with the artwork inside the central 80%, apple-touch 180).
