# HealthBinder

A local-first, patient-owned personal health record and AI health organizer. You own your data — it lives in a SQLite database on your machine.

**Not a medical device. Not HIPAA-compliant. Not for emergencies.**

---

## What it does

- **Inbox** — Paste any medical document (lab report, discharge summary, prescription). AI extracts structured facts; you confirm before anything is saved.
- **Labs & Vitals** — Lab results grouped by panel with trend charts and plain-language explainers for 20 common tests.
- **Imaging** — Store radiology reports with expand/collapse. Look up any term (atelectasis, pleural effusion, etc.) for a plain-language explanation.
- **Medications** — Current and prior meds, allergies, print-to-browser med list.
- **Prevention** — Auto-detected care gaps, USPSTF/CDC/ADA/ACOG/KDCA guidelines, vaccine log.
- **Ask My Record** — Chat with your confirmed health data via an OpenAI-compatible LLM (off by default).
- **Settings** — Profile, guideline lens (country + org preferences), AI config, module toggles, data export/delete.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20, Hono, better-sqlite3, Drizzle ORM, Zod |
| Frontend | React 18, TypeScript, Vite 5, TailwindCSS 3, React Query v5 |
| AI | OpenAI-compatible SDK (works with OpenAI, Maple Proxy, or any compatible endpoint) |
| Database | SQLite (single file, local) |
| i18n | i18next — English + Korean |
| Deployment | Docker (single container) or bare Node |

---

## Running locally

### Prerequisites
- Node.js 20+
- npm 10+

### Setup

```bash
git clone <repo-url>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- Web app: http://localhost:5173
- API server: http://localhost:3001

### Environment variables (`.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `AI_ENABLED` | `false` | Set `true` to enable AI features |
| `AI_API_KEY` | — | Your OpenAI (or compatible) API key |
| `AI_BASE_URL` | `https://api.openai.com/v1` | API endpoint — point to Maple Proxy for privacy |
| `AI_MODEL` | `gpt-4o-mini` | Model name |
| `DATA_DIR` | `./data` | Where the SQLite database lives |

AI is off by default. All core features (manual entry, lab charts, imaging explainer, guidelines, care gaps) work without it.

---

## Running in GitHub Codespaces

1. Open the repo on GitHub → **Code** → **Codespaces** → **Create codespace**
2. Wait for `npm install` to finish (~1 min)
3. In the terminal: `npm run dev`
4. Codespaces auto-opens a browser on port 5173

---

## Docker (production)

```bash
docker build -t healthbinder .
docker run -p 3001:3001 -v $(pwd)/data:/app/data --env-file .env healthbinder
```

---

## Project structure

```
SelfPatientRecord/
├── apps/
│   ├── server/          # Hono API server
│   │   ├── src/
│   │   │   ├── ai/      # Extractor + chat
│   │   │   ├── data/    # Lab + imaging explainer JSON
│   │   │   ├── db/      # Schema + connection
│   │   │   └── rules/   # Care gap engine, module triggers, guideline seeder
│   └── web/             # React frontend
│       └── src/
│           ├── api/     # Typed API client
│           ├── components/
│           ├── i18n/    # en + ko translations
│           └── pages/
├── packages/
│   ├── clinical-rules/  # Module trigger definitions
│   ├── country-packs/   # Preventive care guidelines (US, Korea)
│   └── schemas/         # Shared TypeScript types
└── .devcontainer/       # Codespaces config
```

---

## Disclaimer

HealthBinder is a personal health organizer. It is not a medical device, does not provide medical advice, and is not a substitute for professional medical care. Never use it in an emergency — call your local emergency number. AI features send data to a remote service; review the privacy policy of your chosen provider.
