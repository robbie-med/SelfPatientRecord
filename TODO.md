# HealthBinder — To-Do

## 1 — Bugs (fix before new features)

- [x] **Guideline seeder path** — Fixed: path now goes 4 levels up (`../../../../packages/country-packs`), with `COUNTRY_PACKS_DIR` env var override.

---

## 2 — Core usability (unlocks the primary use cases)

- [x] **Vitals manual entry UI** — Labs page now has a Vitals tab: manual add form (BP, HR, weight, SpO₂, temp), trend chart (dual lines for BP), grouped list.

- [x] **Visit prep export** — Settings > Data > "Print visit prep summary": active conditions, current meds, allergies, recent abnormal labs, open care gaps. Opens formatted print window.

- [x] **Physician handoff export** — Settings > Data > "Print handoff summary": full problem list, all meds, labs latest per test, vitals, vaccines, encounters, care gaps.

---

## 3 — Data completeness

- [ ] **Supplement tracking** — DB table, server routes, and a dedicated Supplements page. Track name, dose, frequency, brand, reason, start date.

- [ ] **Illness episode logging** — DB table, server routes, and a page for logging acute illness episodes (symptoms, start/end dates, severity, treatments, outcome). Useful for pattern recognition and physician visits.

---

## 4 — International guidelines

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

## 5 — Specialty module UIs

These modules are triggered algorithmically but have no dedicated UI yet. Each needs: new DB table(s) + server routes + a React page + nav entry + i18n keys.

- [ ] **Pregnancy module** — From [MyOB](https://github.com/robbie-med/MyOB): kick counter (tap + timestamp log), contraction timer (start/stop with duration + interval), gestational age / EDD tracker, prenatal visit log, BP log, weight tracker, EPDS (Edinburgh Postnatal Depression Scale — 10 questions, scored 0–30), birth plan builder (12 domains: pain management, delivery preferences, etc.), postpartum feeding log, postpartum jaundice day-by-day tracker
- [ ] **Dialysis module** — Session log: date, duration, access site, pre/post weight, UF goal achieved, any complications
- [ ] **Med administration log** — Per-medication dose tracking with timestamp (for PRN meds, insulin, anticoagulants)

---

## 6 — Nice-to-have / future

- [ ] PWA manifest + service worker for offline support
- [ ] Docker Compose with optional Maple Proxy sidecar for AI privacy
- [ ] Additional UI languages: Japanese, Spanish, French, Portuguese, German
- [ ] Lab normal ranges by sex and age (currently static reference ranges only)
- [ ] Timeline search and filtering
- [ ] Encounter / visit notes page
- [ ] Photo attachment for physical documents
- [ ] FHIR R4 import — parse CCD/CCDA XML from patient portal exports
- [ ] Notification/reminder system for overdue screenings (local only, no push)

---

## Done

- [x] **AI configuration UI (DB-backed)** — `ai_config` table; Settings > AI panel with provider/model/key/toggle; no restart needed.
- [x] **Modules toggle UI refresh** — `useMutation` + `invalidateQueries` in Settings.tsx.
- [x] **Guideline seeder path bug** — 4-level relative path + `COUNTRY_PACKS_DIR` env var.
- [x] **Vitals manual entry UI** — Labs page Vitals tab: add form, trend chart (dual-line BP), grouped list.
- [x] **Visit prep export** — Settings > Data; prints formatted summary for doctor appointments.
- [x] **Physician handoff export** — Settings > Data; prints full clinical summary for new providers.
