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
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
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

Uses Replit AI Integrations for OpenAI access (no user API key needed).
- Model: gpt-5.2 with JSON response format
- Charges billed to Replit credits
- Env vars: AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY
