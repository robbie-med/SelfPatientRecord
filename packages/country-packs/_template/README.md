# Template Country Pack

Copy this directory to `packages/country-packs/<iso-code>/` (lowercase ISO 3166-1 alpha-2, e.g. `jp`, `de`, `br`) and fill it in. The seeder picks it up automatically at server startup — no code changes needed. Directories starting with `_` are skipped, so this template is never seeded.

## Ten-minute quickstart

1. **Copy**: `cp -r _template jp` (use your country's code).
2. **Rename the file(s)** if you like — the seeder reads every `*.json` in the directory (except `lab-access.json`). One file per prevention category is the convention: `preventive-care.json`, `vaccinations.json`, `chemoprevention.json`, `supplementation.json`, `augmentation.json`. You can also keep everything in a single file.
3. **Find-and-replace**: `XX` → your ISO country code, `example_health_authority` / `ENHA` → your guideline organization.
4. **Set `language`** to the BCP 47 tag of the language you're authoring in (e.g. `ja`). Text fields (`title`, `recommendation_text`, `patient_facing_summary`) accept either a plain string (English) or an object: `{"en": "...", "ja": "..."}`. English is required; the native text is shown when the patient's preferred language matches.
5. **Set `prevention_category`** at file level (applies to all recs inside) and override per-rec where needed. Allowed values: `primary_prevention`, `secondary_prevention`, `tertiary_prevention`, `vaccination`, `chemoprevention`, `augmentation`, `supplementation`.
6. **Write recommendations** — aim for 20–30 per pack. Each rec needs: stable `id` (org + topic + year), `organization_id`, `country`, `topic`, `title`, `recommendation_text`, `patient_facing_summary`, `source_url`, `version_date`. Use the organization's native evidence-grade system (see SCHEMA.md).
7. **Set `last_reviewed`** to the date you finished verifying the content against the official sources.
8. **Validate**: `python3 -m json.tool preventive-care.json` must parse cleanly. Restart the server and check the log line `[seed-guidelines] Inserted N orgs, N recs`.

## Field reference

See `../SCHEMA.md` for the complete schema, topics list, grade systems, and risk-factor structure.

## Authoring guidelines

- **Cite primary sources.** `source_url` points to the official recommendation page; `version_date` is the guideline's publication/update date.
- **Patient-facing language** in `patient_facing_summary` — no jargon, no diagnoses, "discuss with your doctor" framing.
- **`recommendation_polarity: "against"`** for recommendations NOT to do something (e.g. screening the USPSTF grades D).
- Files are the source of truth: editing a rec updates it on next startup; removing it from all files deactivates it.
