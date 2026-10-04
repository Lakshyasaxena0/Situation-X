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

## Subscriptions & payments (Razorpay, INR)
Prepaid, no auto-renewal: Monthly, 6 Months, 1 Year, 2 Years. Price logic lives in
`artifacts/api-server/src/services/billing.service.ts` (`gross = monthly x months`, minus the plan
discount, plus optional GST; integer paise, always computed on the server). Razorpay Orders API via
`src/lib/razorpay.ts`; routes in `src/routes/billing.ts`; UI at `/pricing`.
- Flow: `POST /api/billing/order` (plan id only) -> Razorpay Checkout in the browser ->
  `POST /api/billing/verify` (HMAC signature check) activates the plan. `POST /api/billing/webhook`
  is the backup (signature-verified; activates even if the browser closed). Both are idempotent.
  Buying while a plan is running adds time on top of the remaining days.
- Tables `subscriptions`, `payments`: run `pnpm --filter @workspace/db run push` after deploying.
- Env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`;
  pricing `BILLING_MONTHLY_PRICE_INR` (default 199), `BILLING_DISCOUNT_PCT` (default `0,10,20,30` for 1/6/12/24 months),
  `BILLING_GST_PCT` (default 0); `BILLING_PAYWALL=on` makes `POST /api/analysis/analyze` require an active
  plan (402 otherwise; default off); `BILLING_FREE_USER_IDS` = comma list of Clerk ids that skip the paywall.
- Razorpay dashboard webhook URL: `https://<your-domain>/api/billing/webhook`, events `payment.captured`
  and `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.
