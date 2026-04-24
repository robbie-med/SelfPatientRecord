# HealthBinder

**Sprache:** [🇺🇸 English](../README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](#) · [🇪🇸 Español](README.es.md) · [🇧🇷 Português](README.pt-br.md) · [🇹🇷 Türkçe](README.tr.md) · [🇨🇳 中文](README.zh.md) · [🇷🇺 Русский](README.ru.md)

---

Eine lokal betriebene, patienteneigene elektronische Gesundheitsakte mit KI-Unterstützung. Ihre Daten bleiben auf Ihrem Gerät in einer SQLite-Datenbank.

**Kein Medizinprodukt. Nicht HIPAA-konform. Nicht für Notfälle geeignet.**

---

## Funktionen

- **Posteingang** — Fügen Sie beliebige medizinische Dokumente ein (Laborbefunde, Arztbriefe, Rezepte). Die KI extrahiert strukturierte Daten; Sie bestätigen vor der Speicherung.
- **Laborbefunde & Vitalwerte** — Nach Panel gruppierte Laborwerte, Trenddiagramme und verständliche Erklärungen für 20 häufige Tests.
- **Bildgebung** — Radiologiebefunde speichern und aufklappen. Fachbegriffe (Atelektase, Pleuraerguss usw.) in einfacher Sprache nachschlagen.
- **Medikamente** — Aktuelle und frühere Medikamente, Allergien, druckbare Medikamentenliste.
- **Prävention** — Automatisch erkannte Versorgungslücken, Leitlinien (AWMF/USPSTF/ADA/ACOG), Impfpass.
- **Meine Akte befragen** — Chatten Sie mit Ihren bestätigten Gesundheitsdaten via KI (standardmäßig deaktiviert).
- **Einstellungen** — Profil, Leitlinienland/-organisation, KI-Konfiguration, Module, Datenexport/-löschung.

---

## Installation

```bash
git clone <Repository-URL>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- Web-App: http://localhost:5173
- API-Server: http://localhost:3001

### Umgebungsvariablen (`.env`)

| Variable | Standard | Beschreibung |
|---|---|---|
| `PORT` | `3001` | API-Server-Port |
| `AI_ENABLED` | `false` | KI-Funktionen aktivieren (`true`) |
| `AI_API_KEY` | — | OpenAI-kompatibler API-Schlüssel |
| `AI_BASE_URL` | `https://api.openai.com/v1` | API-Endpunkt |
| `AI_MODEL` | `gpt-4o-mini` | Modellname |

Alle Kernfunktionen (manuelle Eingabe, Diagramme, Leitlinien, Versorgungslücken) funktionieren ohne KI.

---

## GitHub Codespaces

1. GitHub-Repository → **Code** → **Codespaces** → **Create codespace**
2. Warten bis `npm install` abgeschlossen ist (~1 Min.)
3. Im Terminal: `npm run dev`
4. Codespaces öffnet automatisch den Browser auf Port 5173

---

## Mitwirken

Siehe [CONTRIBUTING.de.md](CONTRIBUTING.de.md) für Anleitungen zum Hinzufügen von Länderpaketen, Modultriggern und Erklärungen.

---

## Haftungsausschluss

HealthBinder ist ein persönliches Gesundheitsorganisations-Tool. Es ist kein Medizinprodukt und ersetzt keine ärztliche Beratung. Im Notfall rufen Sie bitte den Notruf 112 an.
