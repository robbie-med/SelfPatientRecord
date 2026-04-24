# HealthBinder — To-Do

## Bugs

- [ ] **Modules toggle doesn't update UI** — Settings > Modules enable/disable buttons fire the API but the page doesn't refresh. Fix: wrap in `useMutation` with `onSuccess: () => qc.invalidateQueries({ queryKey: ['modules'] })` in `apps/web/src/pages/Settings.tsx`.
- [ ] **Guideline seeder path** — `[seed-guidelines] Country packs directory not found, skipping.` The `__dirname`-relative path from `apps/server/src/rules/seed-guidelines.ts` to `packages/country-packs/` doesn't resolve correctly in all environments. Fix: make the path configurable via `COUNTRY_PACKS_DIR` env var, or copy JSON into `apps/server/src/data/` at build time.

---

## Missing features

- [ ] **Vitals manual entry UI** — Backend and DB table exist, no UI. Add a Vitals section to the Labs page with a manual add form (blood pressure, weight, heart rate, SpO2, temperature) and trend chart. The API functions `getVitals` and `createVital` already exist in `apps/web/src/api/client.ts`.
- [ ] **Supplement tracking** — DB table, server routes, and a dedicated Supplements page. Track name, dose, frequency, brand, reason, start date.
- [ ] **Illness episode logging** — DB table, server routes, and a page for logging acute illness episodes (symptoms, start/end dates, severity, treatments, outcome). Useful for pattern recognition and physician visits.
- [ ] **Visit prep export** — One-click printable/downloadable summary: current meds, allergies, recent abnormal labs, open care gaps, active conditions. Format: plain text or PDF.
- [ ] **Physician handoff export** — Structured clinical summary for sharing with a new provider. More detailed than visit prep, includes full med list, problem list, immunization record.

---

## International guidelines

Country packs are pure JSON — no code changes needed, just add the file. See `packages/country-packs/SCHEMA.md`.

- [ ] Japan (`packages/country-packs/japan/preventive-care.json`) — MHLW national cancer screening, JSH, JDS
- [ ] Canada (`packages/country-packs/canada/preventive-care.json`) — Canadian Task Force on Preventive Health Care
- [ ] United Kingdom (`packages/country-packs/uk/preventive-care.json`) — NHS Health Check, NICE guidelines
- [ ] Germany (`packages/country-packs/germany/preventive-care.json`) — G-BA Krebsfrüherkennung, AWMF
- [ ] France (`packages/country-packs/france/preventive-care.json`) — HAS dépistage organisé
- [ ] Spain (`packages/country-packs/spain/preventive-care.json`) — PAPPS / semFYC
- [ ] Brazil (`packages/country-packs/brazil/preventive-care.json`) — INCA, CFM guidelines
- [ ] Mexico (`packages/country-packs/mexico/preventive-care.json`) — IMSS / Secretaría de Salud
- [ ] Turkey (`packages/country-packs/turkey/preventive-care.json`) — KETEM cancer screening
- [ ] China (`packages/country-packs/china/preventive-care.json`) — NHSA screening programs
- [ ] Russia (`packages/country-packs/russia/preventive-care.json`) — Диспансеризация (clinical examination program)

---

## Specialty modules

These modules are triggered algorithmically but have no dedicated UI yet.

- [ ] **Pregnancy module** — Kick counter (with timestamp log), contraction timer, gestational age tracker, prenatal visit log
- [ ] **Dialysis module** — Session log: date, duration, access site, pre/post weight, UF goal achieved, any complications
- [ ] **Med administration log** — Per-medication dose tracking with timestamp (for PRN meds, insulin, anticoagulants)

Each needs: new DB table(s) + server routes + a React page + nav entry + i18n keys.

---

## Nice-to-have / future

- [ ] PWA manifest + service worker for offline support
- [ ] Docker Compose with optional Maple Proxy sidecar for AI privacy
- [ ] Additional UI languages: Japanese, Spanish, French, Portuguese, German
- [ ] Lab normal ranges by sex and age (currently static reference ranges only)
- [ ] Timeline search and filtering
- [ ] Encounter / visit notes page
- [ ] Photo attachment for physical documents
- [ ] FHIR R4 import — parse CCD/CCDA XML from patient portal exports
- [ ] Notification/reminder system for overdue screenings (local only, no push)
