# HealthBinder — Claude Code Context

## What this is

A local-first, single-tenant personal health record. One patient, one SQLite database, runs on your machine. Not a medical device. Not HIPAA-compliant. Not multi-user. Not cloud-synced. These are intentional design constraints, not gaps.

## Stack at a glance

- **Backend**: Node.js 20, Hono, better-sqlite3, Drizzle ORM, Zod — `apps/server/`
- **Frontend**: React 18, TypeScript, Vite 5, TailwindCSS 3, React Query v5 — `apps/web/`
- **Database**: SQLite, single file, schema initialized via raw SQL in `apps/server/src/db/index.ts`
- **AI**: OpenAI-compatible SDK, off by default (`AI_ENABLED=false` in `.env`)
- **i18n**: English + Korean, `apps/web/src/i18n/en.ts` + `ko.ts`

## Non-negotiable invariants

1. **All DB writes go through Drizzle** — no raw SQL except in `apps/server/src/db/index.ts`
2. **AI-extracted facts must be user-confirmed before entering canonical tables** — `extracted_facts` table is staging only; confirmed facts flow to `conditions`, `medications`, `labs`, etc.
3. **No auth, no sessions, no multi-user** — `getOrCreatePatient()` always returns the one patient record
4. **No comments unless the WHY is non-obvious** — well-named identifiers carry the meaning
5. **No new dependencies without strong justification** — the stack is intentionally minimal

## Key files

| File | Purpose |
|---|---|
| `apps/server/src/index.ts` | All API routes + startup sequence |
| `apps/server/src/db/schema.ts` | All 18 Drizzle table definitions |
| `apps/server/src/db/index.ts` | DB connection + `initDb()` (raw SQL, sync) |
| `apps/server/src/ai/extractor.ts` | AI extraction Zod schemas + prompt |
| `apps/server/src/ai/chat.ts` | Patient context builder + chat handler |
| `apps/server/src/rules/seed-guidelines.ts` | Seeds country pack JSON into SQLite at startup |
| `apps/server/src/rules/care-gaps.ts` | Auto-detects care gaps from patient data |
| `apps/server/src/rules/module-triggers.ts` | Evaluates clinical module trigger rules |
| `apps/server/src/data/lab-explainers.json` | Plain-language lab test explanations |
| `apps/server/src/data/imaging-explainers.json` | Plain-language radiology term explanations |
| `apps/web/src/api/client.ts` | All typed API functions + TypeScript interfaces |
| `apps/web/src/components/Layout.tsx` | Sidebar nav + mobile bottom nav |
| `packages/country-packs/` | Preventive care guidelines by country |
| `packages/clinical-rules/src/module-triggers.json` | 14 clinical module trigger definitions |

## Startup sequence

```
initDb() → seedGuidelines() → getOrCreatePatient() → detectCareGaps() → serve()
```

`detectCareGaps()` also runs on every `GET /api/care-gaps` request.

## Adding things

- **New page**: create in `apps/web/src/pages/`, add route to `App.tsx`, add nav item to `Layout.tsx`, add i18n key to `en.ts` + `ko.ts`
- **New API route**: add to `apps/server/src/index.ts`, add typed function to `apps/web/src/api/client.ts`
- **New DB table**: add to `apps/server/src/db/schema.ts`, add `CREATE TABLE IF NOT EXISTS` in `apps/server/src/db/index.ts`
- **New country pack**: add `packages/country-packs/<code>/preventive-care.json` — seeder picks it up automatically. See `packages/country-packs/SCHEMA.md`.
- **New module trigger**: add entry to `packages/clinical-rules/src/module-triggers.json`

## Known issues (fix before adding features)

- Modules enable/disable button doesn't refresh — missing `queryClient.invalidateQueries` after mutation in `apps/web/src/pages/Settings.tsx`
- Guideline seeder path fails when `__dirname` doesn't resolve correctly in some environments — `[seed-guidelines] Country packs directory not found, skipping.`

## What NOT to do

- Don't add error handling for impossible cases (trust internal code, validate only at boundaries)
- Don't create planning documents or analysis files — work from conversation context
- Don't add backwards-compatibility shims for removed code
- Don't push to `main` — develop on feature branches
- Don't make the patient confirm the same fact twice

## Working in constrained environments

If network is unreliable or context window is limited, see `STRICT_BUILD_MODE.md` for a disciplined file-by-file approach that minimizes re-work on interruption.
