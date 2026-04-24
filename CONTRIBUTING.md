# Contributing to HealthBinder

Thanks for your interest. This document covers the three most common contribution types: adding a country pack, adding a clinical module trigger, and adding a new page.

---

## Adding a country pack

Country packs live in `packages/country-packs/<country-code>/preventive-care.json`. The seeder (`apps/server/src/rules/seed-guidelines.ts`) reads every `preventive-care.json` it finds at startup and inserts the data into SQLite — **you only need to add the JSON file**.

See `packages/country-packs/SCHEMA.md` for the full field reference.

### Steps

1. Create the directory: `packages/country-packs/<iso-code>/`
2. Copy `packages/country-packs/us/preventive-care.json` as a template
3. Replace the organizations and recommendations with your country's data
4. Use unique, stable IDs for each org and recommendation (e.g. `"jpn-ncc-gastric-2023"`)
5. Add the country code to `COUNTRIES` in `apps/web/src/pages/Settings.tsx` if it isn't already listed
6. Start the server — the seeder will pick up the new file automatically

### Sources to reference

Aim for official national screening programs and major professional societies. Include `source_url` and `version_date` for every recommendation so users can verify the guidance.

---

## Adding a clinical module trigger

Module triggers live in `packages/clinical-rules/src/module-triggers.json`.

Each module has an `id`, a `name`, and a `trigger.any[]` array of conditions. If **any** condition in the array matches the patient's data, the module is suggested.

### Condition types

```jsonc
// Lab value threshold
{ "lab": "HbA1c", "operator": ">=", "value": 6.5 }

// Diagnosis keyword (case-insensitive substring match)
{ "diagnosis_contains": "cirrhosis" }

// Medication name (case-insensitive substring match)
{ "medication_name_contains": "warfarin" }
```

### Example — adding a gout module

```json
{
  "id": "gout",
  "name": "Gout Management",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "gout" },
      { "medication_name_contains": "allopurinol" },
      { "medication_name_contains": "febuxostat" }
    ]
  }
}
```

The trigger evaluator runs in `apps/server/src/rules/module-triggers.ts`. No other changes are needed — new modules appear automatically in Settings > Modules.

---

## Adding a new page

1. Create `apps/web/src/pages/YourPage.tsx`
2. Add a route in `apps/web/src/App.tsx`:
   ```tsx
   <Route path="your-page" element={<YourPage />} />
   ```
3. Add a nav item in `apps/web/src/components/Layout.tsx`:
   ```ts
   { to: '/your-page', icon: '🔖', key: 'nav.yourPage' }
   ```
4. Add the translation key to `apps/web/src/i18n/en.ts` and `ko.ts`:
   ```ts
   nav: { yourPage: 'Your Page' }
   ```
5. If you need new API endpoints, add them to `apps/server/src/index.ts` and corresponding typed functions to `apps/web/src/api/client.ts`

---

## Adding a lab explainer

Edit `apps/server/src/data/lab-explainers.json`. Each entry needs:

- `id` — unique snake_case identifier
- `aliases` — array of lowercase strings the fuzzy matcher checks against
- `name` — display name
- `what_it_measures` — plain English, 2–3 sentences
- `unit` — units string
- `normal_range` — human-readable normal range string
- `categories` — array of `{ label, range, color: "green"|"yellow"|"red", meaning }`
- `fasting_required` — boolean
- `why_ordered` — one sentence
- `tips` — one practical tip

---

## Adding an imaging explainer

Edit `apps/server/src/data/imaging-explainers.json`. Each entry needs:

- `id` — unique snake_case identifier
- `aliases` — lowercase strings for fuzzy matching
- `name` — display name
- `plain_english` — 2–3 sentence explanation
- `common_in` — array of modality strings (e.g. `["CT chest", "X-Ray"]`)
- `severity` — `"low"` | `"moderate"` | `"high"` | `"varies"`
- `reassurance` — what is usually benign about this finding
- `when_to_worry` — red-flag signs that warrant follow-up
- `what_to_ask` — questions to ask the doctor

---

## Code style

- TypeScript throughout — no `any` unless unavoidable
- No comments unless the *why* is non-obvious
- No new dependencies without a strong reason — the stack is intentionally minimal
- Keep pages under ~250 lines; extract components if longer
- All DB writes go through Drizzle — no raw SQL except in `db/index.ts`

---

## Medical accuracy

HealthBinder is not a medical device, but accuracy matters because real people use it. When adding clinical content (guidelines, explainers, care gap rules):

- Cite a primary source (`source_url` + `version_date`)
- Use patient-facing language, not clinical jargon
- Include appropriate uncertainty ("may indicate", "discuss with your doctor")
- Never state a diagnosis — describe findings and recommend follow-up
