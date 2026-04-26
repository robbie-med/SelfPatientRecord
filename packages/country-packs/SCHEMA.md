# Country Pack Schema

Each country pack is a single JSON file at:
```
packages/country-packs/<iso-code>/preventive-care.json
```

The seeder reads every file matching this path at server startup. No code changes required — just drop in the file.

---

## Top-level structure

```jsonc
{
  "country": "US",              // ISO 3166-1 alpha-2 country code
  "language": "en",             // Primary language of the content (BCP 47)
  "last_reviewed": "2025-04-25", // Date the pack was last checked for accuracy (YYYY-MM-DD)
  "organizations": [...],        // Medical organizations in this country
  "recommendations": [...]       // Preventive care recommendations
}
```

`last_reviewed` is the date a human last verified that the recommendations reflect current published guidelines. The app shows a warning in the Prevention page when this is more than 12 months ago. Update it whenever you audit or update the pack.

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
  "title": "Colorectal Cancer Screening",  // Short display title
  "recommendation_text": "Screen for colorectal cancer in all adults aged 45 to 75 years...",
  "patient_facing_summary": "Adults 45–75 should be screened for colorectal cancer...",
  "evidence_grade": "A",                   // A, B, C, D, I — or null if org doesn't use grades
  "age_min": 45,                           // Minimum age for recommendation (null = no lower bound)
  "age_max": 75,                           // Maximum age (null = no upper bound)
  "sex_relevance": ["male", "female"],     // Which sexes this applies to
  "pregnancy_relevance": "any",            // "any" | "pregnant" | "not_pregnant"
  "risk_factors": {},                      // Optional structured risk factor requirements
  "interval_months": 120,                  // Recommended screening interval in months (null if varies)
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

```json
{
  "country": "AU",
  "language": "en",
  "organizations": [
    {
      "id": "cancer_council_au",
      "name": "Cancer Council Australia",
      "abbreviation": "CCA",
      "country": "AU",
      "website": "https://www.cancer.org.au",
      "type": "professional_society"
    }
  ],
  "recommendations": [
    {
      "id": "cca-colorectal-2023",
      "organization_id": "cancer_council_au",
      "country": "AU",
      "topic": "colorectal_cancer_screening",
      "title": "Bowel Cancer Screening",
      "recommendation_text": "People aged 45–74 should complete a faecal occult blood test (FOBT) every two years.",
      "patient_facing_summary": "If you're aged 45–74, a free bowel screening kit is mailed to your home every 2 years through the National Bowel Cancer Screening Program.",
      "evidence_grade": null,
      "age_min": 45,
      "age_max": 74,
      "sex_relevance": ["male", "female"],
      "pregnancy_relevance": "any",
      "risk_factors": {},
      "interval_months": 24,
      "source_url": "https://www.cancer.org.au/cancer-information/causes-and-prevention/early-detection/bowel-cancer-screening",
      "version_date": "2023-01-01"
    }
  ]
}
```
