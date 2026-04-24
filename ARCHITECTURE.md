# HealthBinder Architecture

## Core philosophy

**Local-first, patient-confirmed.** No data leaves your machine unless you explicitly enable AI features. Every fact the AI extracts must be confirmed by the user before it enters the canonical record. The database is a single SQLite file you can copy, back up, or delete.

---

## Data flow

```
┌─────────────────────────────────────────────────────┐
│                      INBOX                          │
│  User pastes raw text (lab report, discharge note,  │
│  prescription, imaging report, etc.)                │
└───────────────────┬─────────────────────────────────┘
                    │ POST /api/documents
                    ▼
┌─────────────────────────────────────────────────────┐
│               AI EXTRACTION (optional)              │
│  OpenAI-compatible LLM parses text into typed JSON  │
│  Extracts: conditions, medications, labs, vitals,   │
│  allergies, vaccines, encounters, imaging           │
│  Each fact includes: source_quote, confidence 0–1   │
└───────────────────┬─────────────────────────────────┘
                    │ extracted_facts table (unconfirmed)
                    ▼
┌─────────────────────────────────────────────────────┐
│              USER CONFIRMATION                      │
│  FactCard UI shows each extracted fact with         │
│  source quote + confidence badge                    │
│  User clicks Confirm or Reject for each one         │
└───────────────────┬─────────────────────────────────┘
                    │ POST /api/documents/:id/confirm
                    ▼
┌─────────────────────────────────────────────────────┐
│             CANONICAL RECORD (SQLite)               │
│  conditions │ medications │ labs │ vitals           │
│  allergies  │ vaccines    │ encounters │ imaging     │
└──────┬──────────────┬──────────────┬────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────────────┐
│ CARE GAPS  │ │  MODULE    │ │  PATIENT CONTEXT   │
│ ENGINE     │ │ TRIGGERS   │ │  BUILDER           │
│            │ │            │ │                    │
│ Reads labs,│ │ Reads labs,│ │ Assembles age, sex,│
│ conditions,│ │ conditions,│ │ conditions, meds,  │
│ meds →     │ │ meds →     │ │ labs, allergies    │
│ writes to  │ │ suggests   │ │ into a structured  │
│ care_gaps  │ │ modules    │ │ context object     │
└────────────┘ └────────────┘ └────────┬───────────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │   ASK MY RECORD     │
                              │                     │
                              │ Patient context +   │
                              │ chat history →      │
                              │ LLM → answer +      │
                              │ citations           │
                              └─────────────────────┘
```

---

## Module system

Modules are opt-in clinical panels triggered by patient data:

```
module-triggers.json
  └── trigger conditions (lab value, diagnosis keyword, medication name)
        └── evaluateModuleTriggers() runs at document confirmation
              └── sets module_status = 'suggested' for matching modules
                    └── user enables/disables in Settings > Modules
```

14 built-in modules: diabetes, prediabetes, liver health, kidney health, pregnancy, thyroid, dialysis, anticoagulation, cardiac, asthma/COPD, mental health, cancer history, lipids, osteoporosis.

---

## Guideline architecture

```
country-packs/
  us/preventive-care.json       ← organizations + recommendations
  korea/preventive-care.json
  ...

seed-guidelines.ts              ← runs at startup, inserts into SQLite
  └── guideline_organizations table
  └── guideline_recommendations table

GET /api/guidelines             ← filters by patient age, sex, guideline lens
  └── guideline_lens (on patient record):
        default_country          ← primary guideline country
        comparison_countries     ← show these countries' guidelines too
        preferred_organizations  ← filter by org (USPSTF, ADA, etc.)
```

---

## Database tables

| Table | Purpose |
|---|---|
| `patients` | Single patient record with profile + guideline lens |
| `documents` | Raw pasted documents |
| `extracted_facts` | AI-extracted facts pending confirmation |
| `conditions` | Confirmed diagnoses / problem list |
| `medications` | Current and prior medications |
| `labs` | Lab results with reference ranges |
| `vitals` | Blood pressure, weight, heart rate, etc. |
| `allergies` | Drug, food, environmental allergies |
| `vaccines` | Immunization record |
| `encounters` | Office visits, hospital stays |
| `imaging_reports` | Radiology reports |
| `module_status` | Per-module on/off/suggested state |
| `guideline_organizations` | Medical orgs (USPSTF, CDC, ADA, …) |
| `guideline_recommendations` | Screening + preventive care recs |
| `care_gaps` | Auto-detected care gaps (open/dismissed) |
| `chat_messages` | Ask My Record conversation history |
| `audit_log` | Every AI-involved action |

---

## API conventions

- All routes under `/api/`
- JSON request/response throughout
- Patient is always single-tenant (one record, created on first request)
- AI routes return `{ error }` with appropriate HTTP status when AI is disabled
- Confirmed facts only — the frontend never reads unconfirmed `extracted_facts` directly into clinical views

---

## i18n layers

HealthBinder has four distinct language dimensions:

1. **UI language** — what the interface displays (`en` / `ko`, switchable at runtime)
2. **Medical vocabulary** — terms in the patient's preferred language
3. **Guideline jurisdiction** — which country's guidelines to show (independent of UI language)
4. **Export language** — language used in physician handoff exports

All four are stored separately on the patient record.

---

## AI privacy model

- AI is **off by default** (`AI_ENABLED=false`)
- When enabled, only the text you paste (Inbox) or your confirmed health summary (Ask My Record) is sent to the configured endpoint
- Point `AI_BASE_URL` at [Maple Proxy](https://mapleproxy.com) or a self-hosted model to keep data within your control
- The audit log records every AI-involved action
