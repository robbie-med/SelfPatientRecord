# HealthBinder — AI Agent Instructions

This file is for AI coding agents (OpenAI Codex, Gemini, Devin, Deepseek Coder, Kai, Zai, and others). Read this before making any changes.

## Project summary

HealthBinder is a local-first, single-tenant personal health record. One SQLite database, one patient, runs on the user's machine. The user pastes medical documents; AI extracts structured facts; the user confirms each one before it enters the record. Not a medical device. Not HIPAA-compliant by design.

## Repository layout

```
apps/server/          Node.js 20 + Hono API server
apps/web/             React 18 + Vite frontend
packages/country-packs/   Preventive care guidelines (JSON) by country
packages/clinical-rules/  Module trigger definitions (JSON)
```

## Rules that must not be broken

1. **Never write raw SQL outside `apps/server/src/db/index.ts`** — all other DB access uses Drizzle ORM
2. **Never save AI-extracted data to canonical tables without user confirmation** — extracted facts live in `extracted_facts` table until confirmed
3. **Never add auth or multi-user logic** — single-tenant is an intentional design decision
4. **Never add a dependency without a clear reason** — check if the standard library or an existing dep already solves the problem
5. **Never push directly to main**

## Development workflow

```bash
npm install          # install all workspace deps from root
npm run dev          # starts server (:3001) + Vite (:5173) concurrently
```

Environment: copy `.env.example` → `.env`. AI is off by default.

## How to add common things

### New API endpoint
1. Add route handler in `apps/server/src/index.ts`
2. Add typed function in `apps/web/src/api/client.ts`

### New frontend page
1. Create `apps/web/src/pages/PageName.tsx`
2. Add `<Route path="page-name" element={<PageName />} />` in `apps/web/src/App.tsx`
3. Add nav item to `apps/web/src/components/Layout.tsx`
4. Add translation keys to `apps/web/src/i18n/en.ts` and `ko.ts`

### New country's guidelines
Create `packages/country-packs/<iso-code>/preventive-care.json` following the schema in `packages/country-packs/SCHEMA.md`. The seeder picks it up automatically at server startup — no code changes needed.

### New DB table
1. Add table definition to `apps/server/src/db/schema.ts` using Drizzle's `sqliteTable`
2. Add `CREATE TABLE IF NOT EXISTS` SQL to `apps/server/src/db/index.ts`

## Medical content guidelines

- Cite primary sources (`source_url` + `version_date`)
- Use patient-facing language, not clinical jargon
- Express uncertainty: "may indicate", "discuss with your doctor"
- Never state a diagnosis — describe findings and recommend follow-up

## Key open issues

See `TODO.md` for the full list. Most pressing:
- Modules toggle button doesn't update UI (missing query invalidation in Settings.tsx)
- Guideline seeder path resolution fails in some environments

## Constrained environments

If working with limited context or unreliable network, see `STRICT_BUILD_MODE.md`.
