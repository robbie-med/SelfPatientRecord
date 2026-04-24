# Beitrag zu HealthBinder

**Sprache:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](CONTRIBUTING.ko.md) · [🇯🇵 日本語](CONTRIBUTING.ja.md) · [🇫🇷 Français](CONTRIBUTING.fr.md) · [🇩🇪 Deutsch](#) · [🇪🇸 Español](CONTRIBUTING.es.md) · [🇧🇷 Português](CONTRIBUTING.pt-br.md) · [🇹🇷 Türkçe](CONTRIBUTING.tr.md) · [🇨🇳 中文](CONTRIBUTING.zh.md) · [🇷🇺 Русский](CONTRIBUTING.ru.md)

---

## Länderpaket für Leitlinien hinzufügen

Pakete befinden sich unter `packages/country-packs/<Ländercode>/preventive-care.json`. Der Server liest sie beim Start automatisch ein — **nur die JSON-Datei hinzufügen**, keine Codeänderungen erforderlich.

Die vollständige Feldreferenz finden Sie in `packages/country-packs/SCHEMA.md`.

### Schritte

1. Verzeichnis `packages/country-packs/<ISO-Code>/` erstellen
2. `packages/country-packs/us/preventive-care.json` als Vorlage kopieren
3. Organisationen und Empfehlungen durch die des Ziellandes ersetzen
4. Eindeutige, stabile IDs verwenden (z. B. `"awmf-colorectal-2023"`)
5. Ländercode in `COUNTRIES` in `apps/web/src/pages/Settings.tsx` ergänzen, falls noch nicht vorhanden
6. Server neu starten — die Datei wird automatisch erkannt

### Empfohlene Quellen

Nationale Krebsfrüherkennungsprogramme und große Fachgesellschaften (z. B. AWMF, DGIM, DGK). Jede Empfehlung muss `source_url` und `version_date` enthalten.

---

## Klinischen Modultrigger hinzufügen

Trigger befinden sich in `packages/clinical-rules/src/module-triggers.json`.

```json
{
  "id": "gicht",
  "name": "Gicht-Management",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "Gicht" },
      { "medication_name_contains": "allopurinol" }
    ]
  }
}
```

Bedingungstypen: `lab` (Laborwert-Schwellenwert), `diagnosis_contains` (Teilstring der Diagnose), `medication_name_contains` (Teilstring des Medikaments).

---

## Neue Seite hinzufügen

1. `apps/web/src/pages/PageName.tsx` erstellen
2. Route in `apps/web/src/App.tsx` hinzufügen
3. Navigationseintrag in `apps/web/src/components/Layout.tsx` ergänzen
4. Übersetzungsschlüssel in `apps/web/src/i18n/en.ts` und `ko.ts` eintragen
5. API-Endpunkte in `apps/server/src/index.ts`, typisierte Funktionen in `apps/web/src/api/client.ts`

---

## Medizinische Genauigkeit

- Primärquelle angeben (`source_url` + `version_date`)
- Patientenfreundliche Sprache statt Fachsprache
- Unsicherheit ausdrücken: „kann hinweisen auf", „sprechen Sie mit Ihrem Arzt"
- Keine Diagnosen stellen — Befunde beschreiben und Nachsorge empfehlen

---

## Code-Stil

- Nur TypeScript, `any` nur in Ausnahmefällen
- Kommentare nur wenn das WARUM nicht offensichtlich ist
- Seitenkomponenten unter 250 Zeilen
- DB-Zugriff ausschließlich über Drizzle ORM
