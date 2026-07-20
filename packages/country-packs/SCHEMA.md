# Country Pack Schema

Each country pack is a directory of JSON files at:
```
packages/country-packs/<iso-code>/
  preventive-care.json        # primary + secondary + tertiary prevention
  vaccinations.json           # immunization schedules
  chemoprevention.json        # drugs given to prevent disease
  augmentation.json           # replacement/additive therapies (HRT, thyroid, etc.)
  supplementation.json        # vitamins/minerals
  lab-access.json             # direct-to-consumer lab access info (separate schema, seeded elsewhere)
```

The seeder reads **every `*.json`** in each country directory at server startup (except `lab-access.json`). Directories starting with `_` (e.g. `_template/`) are skipped. All files share the schema below; a file may declare a file-level `prevention_category` that applies to every recommendation inside unless overridden per-rec.

Files are the source of truth: recommendations updated in a file are updated in the DB on next startup, and recommendations removed from all files are deactivated (`is_active = false`).

---

## Top-level structure

```jsonc
{
  "country": "US",              // ISO 3166-1 alpha-2 country code
  "language": "en",             // BCP 47 tag of the native-language content (or "en")
  "last_reviewed": "2025-04-25", // Date this FILE was last checked for accuracy (YYYY-MM-DD)
  "prevention_category": "secondary_prevention", // Default category for recs in this file
  "organizations": [...],        // Medical organizations referenced by recs in this file
  "recommendations": [...]       // Recommendations
}
```

`last_reviewed` is the date a human last verified the file against current published guidelines. The app shows a warning on the Prevention page when a pack's oldest `last_reviewed` is more than 12 months ago. Update it whenever you audit or update the file.

---

## Prevention categories

Every recommendation carries a `prevention_category` (per-rec, or inherited from the file):

| Category | Meaning | Examples |
|---|---|---|
| `primary_prevention` | Lifestyle/behavioral interventions for asymptomatic people | diet & PA counseling, tobacco cessation, STI counseling |
| `secondary_prevention` | Screening tests for asymptomatic disease | cancer screening, lipid panel, A1c screening, depression screening |
| `tertiary_prevention` | Monitoring/managing established disease to prevent complications | diabetic foot exam, retinopathy screening, cardiac rehab |
| `vaccination` | All immunizations | flu, Tdap, Shingrix |
| `chemoprevention` | Drugs given specifically to prevent disease | low-dose aspirin, statins for primary prevention, tamoxifen |
| `augmentation` | Replacement/additive therapies for deficiency or function | HRT, thyroid replacement, GLP-1 |
| `supplementation` | Vitamins/minerals/nutritional supplements | folic acid, vitamin D |

`recommendation_polarity` is `"for"` (default) or `"against"` — use `"against"` for recommendations NOT to do something (e.g. USPSTF Grade D).

---

## Localized text fields

`title`, `recommendation_text`, and `patient_facing_summary` accept either a plain string (treated as English) or an object with English plus the pack's native language:

```jsonc
"title": { "en": "Gastric Cancer Screening", "ja": "胃がん検診" }
```

The seeder stores the English text in `title` and the native text in `title_native`; the API serves native text when the patient's preferred language matches the pack language, with English fallback.

---

## Organization object

```jsonc
{
  "id": "uspstf",                          // Unique stable ID (used as FK in recommendations)
  "name": "United States Preventive Services Task Force",
  "abbreviation": "USPSTF",               // Short display name
  "country": "US",                         // ISO country code
  "website": "https://www.uspreventiveservicestaskforce.org",
  "type": "government_affiliated"          // See types below
}
```

### Organization types
- `government` — national health ministry or agency
- `government_affiliated` — quasi-governmental body
- `professional_society` — medical specialty association
- `insurance` — national insurance / payer body
- `academic` — research institution

---

## Recommendation object

```jsonc
{
  "id": "uspstf-colorectal-2021",          // Unique stable ID — include org + topic + year
  "organization_id": "uspstf",             // Must match an organization.id in this file
  "country": "US",                         // ISO country code
  "topic": "colorectal_cancer_screening",  // Snake_case topic (see topics below)
  "subtopic": "average_risk",              // Optional further classification
  "module_tags": ["preventive_care", "cancer_screening"],  // Used to filter by active modules
  "title": "Colorectal Cancer Screening",  // String or localized object
  "recommendation_text": "Screen for colorectal cancer in all adults aged 45 to 75 years...",
  "patient_facing_summary": "Adults 45–75 should be screened for colorectal cancer...",
  "evidence_grade": "A",                   // A, B, C, D, I — or null if org doesn't use grades
  "age_min": 45,                           // Minimum age for recommendation (null = no lower bound)
  "age_max": 75,                           // Maximum age (null = no upper bound)
  "sex_relevance": ["male", "female"],     // Which sexes this applies to
  "pregnancy_relevance": "any",            // "any" | "pregnant" | "not_pregnant"
  "risk_factors": {},                      // Optional structured risk factor requirements
  "interval_months": 120,                  // Recommended screening interval in months (null if varies)
  "prevention_category": "secondary_prevention", // Overrides file default
  "recommendation_polarity": "for",        // "for" (default) | "against"
  "source_url": "https://...",             // Link to the official recommendation
  "version_date": "2021-05-18"            // Date of the guideline version (YYYY-MM-DD)
}
```

### Required fields
`id`, `organization_id`, `country`, `topic`, `title`, `recommendation_text`, `patient_facing_summary`

### Common topics
```
diabetes_screening
colorectal_cancer_screening
breast_cancer_screening
cervical_cancer_screening
lung_cancer_screening
hypertension_screening
lipid_screening
osteoporosis_screening
hepatitis_b_screening
hepatitis_c_screening
hiv_screening
depression_screening
obesity_screening
vision_screening
hearing_screening
gastric_cancer_screening
liver_cancer_screening
thyroid_screening
general_health_checkup
```

### Evidence grades by organization

| Organization | Grade scale |
|---|---|
| USPSTF | A, B, C, D, I (Insufficient) |
| CDC | no formal grades |
| ADA | A, B, C, E (Expert opinion) |
| ACOG | A, B, C, good practice point |
| KDCA | 1A, 1B, 2A, 2B, or no grade |
| KDA | A, B, C, E |
| Most European | Strong / Conditional / Weak |

Use the organization's native grade system. If none, use `null`.

### Risk factors object

Optional structured risk requirements. Currently informational only (not enforced by the engine). Examples:

```jsonc
{ "bmi_category": ["overweight", "obesity"] }
{ "smoking_history": "current_or_former" }
{ "family_history": ["colorectal_cancer"] }
```

---

## Minimal valid example

See `packages/country-packs/_template/` for a complete working example with a README walkthrough.
