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

- [x] **Supplement tracking** — DB table, server routes, and a dedicated Supplements page. Track name, dose, frequency, brand, reason, start date.

- [x] **Illness episode logging** — DB table, server routes, and a page for logging acute illness episodes (symptoms, start/end dates, severity, treatments, outcome). Useful for pattern recognition and physician visits.

---

## 4 — US country pack completion

The US pack has 39 recs across 6 orgs but is missing several important areas. All fixes are JSON-only — no code changes needed.

### 4a — Adult vaccine schedule (CDC/ACIP — currently 0 recs)

- [ ] **Influenza** — Annual for all adults 6 months+. High-dose/adjuvanted preferred for 65+. CDC/ACIP.
- [ ] **Tdap/Td** — One-time Tdap then Td booster every 10 years. Tdap each pregnancy (27–36 weeks). CDC/ACIP.
- [ ] **Shingles (Zoster, RZV)** — 2-dose Shingrix series for all adults 50+, regardless of prior Zostavax. CDC/ACIP.
- [ ] **Pneumococcal** — PCV15 or PCV20 for all adults 65+; earlier for immunocompromised/high-risk. CDC/ACIP.
- [ ] **HPV** — 2–3 dose series through age 26; shared decision-making 27–45. CDC/ACIP.
- [ ] **COVID-19** — Annual updated vaccine for all adults. CDC/ACIP.
- [ ] **Hepatitis A** — All unvaccinated adults at risk (travel, liver disease, MSM, homelessness). CDC/ACIP.
- [ ] **Meningococcal (MenACWY, MenB)** — MenACWY for adults at risk; MenB shared decision-making 16–23. CDC/ACIP.
- [ ] **RSV** — Single dose for adults 60+ (shared decision-making). CDC/ACIP (2023).

### 4b — Missing USPSTF recommendations

- [ ] **Aspirin for CVD primary prevention** — Recommend *against* for adults 60+; shared decision-making for adults 40–59 with ≥10% 10-year CVD risk. USPSTF Grade D (60+) / C (40–59). Critical "don't do this" rec.
- [ ] **Folic acid supplementation** — 0.4–0.8 mg/day for people planning or capable of pregnancy. USPSTF Grade B.
- [ ] **Vitamin D deficiency screening** — Recommends against screening in asymptomatic adults. USPSTF Grade D (important to show).
- [ ] **Healthy diet and physical activity counseling** — Adults with CVD risk factors, overweight/obesity. USPSTF Grade B.
- [ ] **Statin use for CVD prevention** — Adults 40–75 with ≥1 CVD risk factor and ≥10% 10-year risk. USPSTF Grade B. (Note: distinct from AHA/ACC lipid screening already present.)
- [ ] **Hearing loss screening** — USPSTF "I" grade (insufficient evidence) for adults — worth showing.
- [ ] **Cognitive impairment screening** — USPSTF "I" grade for adults 65+ — worth showing.
- [ ] **Thyroid dysfunction screening** — USPSTF "I" grade — worth showing.
- [ ] **Vitamin D / fall prevention** — Recommends against vitamin D supplementation for fall prevention in community-dwelling adults 60+. USPSTF Grade D.
- [ ] **Illicit drug use screening** — USPSTF "I" grade (separate from substance_use_screening which covers alcohol/tobacco). Worth showing.
- [ ] **Aspirin to prevent colorectal cancer** — USPSTF Grade C for adults 50–59 with ≥10% 10-year CVD risk (separate from colorectal screening rec).
- [ ] **Oral health / dental caries (adults)** — USPSTF "I" grade for adults; current rec is pediatric only.
- [ ] **Sexually transmitted infections counseling** — Behavioral counseling for sexually active adolescents and adults at increased risk. USPSTF Grade B.
- [ ] **Prediabetes/type 2 diabetes — intensive behavioral counseling** — Adults 35–70 who are overweight or obese. USPSTF Grade B.

### 4c — Incomplete specialty org coverage

- [ ] **AHA/ACC** — Add: blood pressure self-monitoring recommendation, physical activity guidelines (150 min/week moderate), cardiac rehab eligibility criteria.
- [ ] **ADA** — Add: annual comprehensive foot exam detail, continuous glucose monitoring rec for T1D/insulin-using T2D, annual dental exam for diabetics, diabetes distress screening, statin therapy for diabetics 40–75.
- [ ] **ACOG** — Add: preconception care visit, annual well-woman exam framework, cervical cancer co-testing intervals, gestational hypertension screening, postpartum depression screening (EPDS at 4–6 weeks), preterm birth prevention (progesterone for history of preterm).
- [ ] **ACS** — Add: lung cancer screening alignment with USPSTF, prostate cancer screening shared decision-making detail, cervical cancer screening (aligned with ASCCP).

### 4d — Template country pack

- [ ] Create `packages/country-packs/_template/preventive-care.json` — a minimal working example with one org and two recommendations (one cancer screening, one vaccine), all optional fields populated, inline field-level comments in a paired `_template/README.md`. Goal: a contributor can clone the folder, do find-replace on the org/country fields, and have a valid pack in 10 minutes.

---

## 5 — International guidelines (new country packs)

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
