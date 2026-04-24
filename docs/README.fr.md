# HealthBinder

**Langue:** [🇺🇸 English](../README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇫🇷 Français](#) · [🇩🇪 Deutsch](README.de.md) · [🇪🇸 Español](README.es.md) · [🇧🇷 Português](README.pt-br.md) · [🇹🇷 Türkçe](README.tr.md) · [🇨🇳 中文](README.zh.md) · [🇷🇺 Русский](README.ru.md)

---

Un dossier médical personnel en local, appartenant au patient, avec un assistant IA. Vos données restent sur votre machine dans une base SQLite.

**Ce n'est pas un dispositif médical. Non conforme HIPAA. Ne pas utiliser en cas d'urgence.**

---

## Fonctionnalités

- **Boîte de réception** — Collez n'importe quel document médical (résultats d'analyses, compte-rendu de sortie, ordonnance). L'IA extrait les données structurées ; vous confirmez avant tout enregistrement.
- **Analyses & Constantes** — Résultats groupés par panel, graphiques de tendance, explications en langage clair pour 20 analyses courantes.
- **Imagerie médicale** — Conservez vos comptes-rendus radiologiques. Recherchez un terme (atélectasie, épanchement pleural, etc.) pour une explication accessible.
- **Médicaments** — Traitements en cours et antérieurs, allergies, liste imprimable.
- **Prévention** — Lacunes de soins détectées automatiquement, recommandations HAS/USPSTF/ADA/ACOG, carnet vaccinal.
- **Interroger mon dossier** — Dialoguez avec vos données de santé confirmées via un LLM compatible OpenAI (désactivé par défaut).
- **Paramètres** — Profil, pays et organismes de référence, configuration IA, modules, export/suppression des données.

---

## Installation

```bash
git clone <url-du-dépôt>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- Application web : http://localhost:5173
- Serveur API : http://localhost:3001

### Variables d'environnement (`.env`)

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3001` | Port du serveur API |
| `AI_ENABLED` | `false` | Activer les fonctions IA (`true`) |
| `AI_API_KEY` | — | Clé API compatible OpenAI |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Point d'accès API |
| `AI_MODEL` | `gpt-4o-mini` | Nom du modèle |

Toutes les fonctionnalités principales (saisie manuelle, graphiques, recommandations, lacunes de soins) fonctionnent sans IA.

---

## GitHub Codespaces

1. Dépôt GitHub → **Code** → **Codespaces** → **Create codespace**
2. Attendez la fin de `npm install` (~1 min)
3. Dans le terminal : `npm run dev`
4. Codespaces ouvre automatiquement le navigateur sur le port 5173

---

## Contribuer

Consultez [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md) pour savoir comment ajouter des packs de recommandations par pays, des déclencheurs de modules cliniques ou des explications d'analyses.

---

## Avertissement

HealthBinder est un outil d'organisation de santé personnelle. Ce n'est pas un dispositif médical et ne remplace pas un professionnel de santé. En cas d'urgence, appelez le 15 (SAMU) ou le 112.
