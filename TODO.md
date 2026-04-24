# HealthBinder — To-Do

## Bugs (fix first)

- [ ] **Modules don't toggle** — Settings > Modules enable/disable buttons fire the API but the UI doesn't refresh. Fix: wrap in `useMutation` with `onSuccess: () => qc.invalidateQueries({ queryKey: ['modules'] })` in `apps/web/src/pages/Settings.tsx`.
- [ ] **Guideline seeder path** — Country packs directory not found at runtime because the path resolution differs between dev (tsx) and built output. Logged as `[seed-guidelines] Country packs directory not found, skipping.` Fix: make the path configurable via env var or copy JSON into `apps/server/src/data/` at build time.

---

## Remaining planned batches

### Batch 4 — Supplement tracking + illness episode logging
- [ ] DB tables: `supplements`, `illness_episodes`
- [ ] Server routes: CRUD for both
- [ ] `apps/web/src/pages/Supplements.tsx`
- [ ] `apps/web/src/pages/Illness.tsx`
- [ ] Nav + routes + i18n

### Batch 5 — Country packs (Japan, Canada, UK, Germany, France)
- [ ] `packages/country-packs/japan/preventive-care.json`
- [ ] `packages/country-packs/canada/preventive-care.json`
- [ ] `packages/country-packs/uk/preventive-care.json`
- [ ] `packages/country-packs/germany/preventive-care.json`
- [ ] `packages/country-packs/france/preventive-care.json`

### Batch 6 — Country packs (Spain, Brazil, Mexico, Turkey, China, Russia)
- [ ] `packages/country-packs/spain/preventive-care.json`
- [ ] `packages/country-packs/brazil/preventive-care.json`
- [ ] `packages/country-packs/mexico/preventive-care.json`
- [ ] `packages/country-packs/turkey/preventive-care.json`
- [ ] `packages/country-packs/china/preventive-care.json`
- [ ] `packages/country-packs/russia/preventive-care.json`

### Batch 7 — Specialty module UIs
- [ ] Pregnancy module: kick counter, contraction timer UI
- [ ] Dialysis module: session log (weight, duration, access site, UF goal)
- [ ] Med administration log: when/dose tracking per medication
- [ ] DB tables + server routes + pages for all three

---

## Missing features (discovered during testing)

- [ ] **Vitals manual entry UI** — Backend + DB exist, no UI. Add a Vitals section to the Labs page (blood pressure, weight, heart rate, SpO2, temperature) with a manual add form and trend chart.
- [ ] **Guideline seeder path fix** — See Bugs above.
- [ ] **Visit prep export** — Generate a structured summary (current meds, allergies, recent labs, open care gaps, questions) as a printable/downloadable PDF or plain text.
- [ ] **Physician handoff export** — Structured clinical summary for sharing with a new provider.

---

## Nice-to-have / future

- [ ] PWA manifest + service worker (offline support)
- [ ] Docker Compose with optional Maple Proxy sidecar
- [ ] Additional i18n languages (Japanese, Spanish, French, Portuguese, German)
- [ ] Lab normal ranges by sex/age (currently static reference ranges only)
- [ ] Timeline filtering and search
- [ ] Encounter / visit notes page
- [ ] Photo attachment for physical documents
- [ ] FHIR R4 import (parse CCD/CCDA from patient portals)
