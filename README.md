# HealthBinder

**Language / 언어 / 言語 / Langue / Sprache / Idioma / Língua / Dil / 语言 / Язык**

[🇺🇸 English](#) · [🇰🇷 한국어](docs/README.ko.md) · [🇯🇵 日本語](docs/README.ja.md) · [🇫🇷 Français](docs/README.fr.md) · [🇩🇪 Deutsch](docs/README.de.md) · [🇪🇸 Español](docs/README.es.md) · [🇧🇷 Português](docs/README.pt-br.md) · [🇹🇷 Türkçe](docs/README.tr.md) · [🇨🇳 中文](docs/README.zh.md) · [🇷🇺 Русский](docs/README.ru.md)

---

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
| i18n | i18next — English + Korean (UI); guidelines available for US, Korea, and more |
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
| `AI_BASE_URL` | `https://api.openai.com/v1` | API endpoint — point to [Maple Proxy](https://github.com/opensecretcloud/maple-proxy) for privacy |
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
│   │   └── src/
│   │       ├── ai/      # Extractor + chat
│   │       ├── data/    # Lab + imaging explainer JSON
│   │       ├── db/      # Schema + connection
│   │       └── rules/   # Care gap engine, module triggers, guideline seeder
│   └── web/             # React frontend
│       └── src/
│           ├── api/     # Typed API client
│           ├── components/
│           ├── i18n/    # en + ko translations
│           └── pages/
├── packages/
│   ├── clinical-rules/  # Module trigger definitions
│   ├── country-packs/   # Preventive care guidelines by country
│   └── schemas/         # Shared TypeScript types
├── docs/                # Translated documentation
└── .devcontainer/       # Codespaces config
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add country guideline packs, clinical module triggers, lab/imaging explainers, and new pages.

Translations of the contributing guide: [한국어](docs/CONTRIBUTING.ko.md) · [日本語](docs/CONTRIBUTING.ja.md) · [Français](docs/CONTRIBUTING.fr.md) · [Deutsch](docs/CONTRIBUTING.de.md) · [Español](docs/CONTRIBUTING.es.md) · [Português](docs/CONTRIBUTING.pt-br.md) · [Türkçe](docs/CONTRIBUTING.tr.md) · [中文](docs/CONTRIBUTING.zh.md) · [Русский](docs/CONTRIBUTING.ru.md)

---

## Disclaimer

HealthBinder is a personal health organizer. It is not a medical device, does not provide medical advice, and is not a substitute for professional medical care. Never use it in an emergency — call your local emergency number. AI features send data to a remote service; review the privacy policy of your chosen provider.
