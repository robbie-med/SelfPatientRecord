# GitHub Copilot Instructions — HealthBinder

## Project

Local-first personal health record. Node.js 20 + Hono backend, React 18 + Vite frontend, SQLite via Drizzle ORM. Single patient, single tenant. Not a medical device.

## Constraints

- **DB**: Use Drizzle ORM for all queries. Raw SQL only in `apps/server/src/db/index.ts`.
- **AI pipeline**: Extracted facts go to `extracted_facts` table first. Only write to `conditions`, `medications`, `labs`, etc. after `user_confirmed = true`.
- **No auth**: `getOrCreatePatient()` is the only patient access pattern.
- **No new deps** unless the existing stack genuinely can't solve the problem.
- **No diagnostic language**: medical content should describe findings and recommend follow-up, never state a diagnosis.

## File locations

| What | Where |
|---|---|
| API routes | `apps/server/src/index.ts` |
| DB schema | `apps/server/src/db/schema.ts` |
| Typed API client | `apps/web/src/api/client.ts` |
| Pages | `apps/web/src/pages/` |
| i18n (en + ko) | `apps/web/src/i18n/` |
| Country packs | `packages/country-packs/<code>/preventive-care.json` |
| Module triggers | `packages/clinical-rules/src/module-triggers.json` |
| Lab explainers | `apps/server/src/data/lab-explainers.json` |
| Imaging explainers | `apps/server/src/data/imaging-explainers.json` |

## Style

- TypeScript everywhere, no `any`
- No comments unless the WHY is non-obvious
- Keep page components under ~250 lines; extract sub-components if longer
- TailwindCSS only — no inline styles, no CSS modules

See `CONTRIBUTING.md` for full contribution guide.
