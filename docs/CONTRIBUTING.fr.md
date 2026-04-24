# Guide de contribution à HealthBinder

**Langue:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](CONTRIBUTING.ko.md) · [🇯🇵 日本語](CONTRIBUTING.ja.md) · [🇫🇷 Français](#) · [🇩🇪 Deutsch](CONTRIBUTING.de.md) · [🇪🇸 Español](CONTRIBUTING.es.md) · [🇧🇷 Português](CONTRIBUTING.pt-br.md) · [🇹🇷 Türkçe](CONTRIBUTING.tr.md) · [🇨🇳 中文](CONTRIBUTING.zh.md) · [🇷🇺 Русский](CONTRIBUTING.ru.md)

---

## Ajouter un pack de recommandations par pays

Les packs se trouvent dans `packages/country-packs/<code-pays>/preventive-care.json`. Le serveur les charge automatiquement au démarrage — **il suffit d'ajouter le fichier JSON**, aucune modification de code n'est nécessaire.

Consultez `packages/country-packs/SCHEMA.md` pour la référence complète des champs.

### Étapes

1. Créer le dossier `packages/country-packs/<code-ISO>/`
2. Copier `packages/country-packs/us/preventive-care.json` comme modèle
3. Remplacer les organisations et recommandations par celles de votre pays
4. Utiliser des identifiants uniques et stables (ex : `"has-colorectal-2023"`)
5. Ajouter le code pays dans `COUNTRIES` dans `apps/web/src/pages/Settings.tsx` s'il n'y est pas
6. Redémarrer le serveur — le fichier est reconnu automatiquement

### Sources à privilégier

Référencez les programmes nationaux officiels de dépistage et les grandes sociétés savantes. Incluez `source_url` et `version_date` pour chaque recommandation.

---

## Ajouter un déclencheur de module clinique

Les déclencheurs se trouvent dans `packages/clinical-rules/src/module-triggers.json`.

```json
{
  "id": "goutte",
  "name": "Gestion de la goutte",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "goutte" },
      { "medication_name_contains": "allopurinol" }
    ]
  }
}
```

Types de conditions : `lab` (seuil d'analyse), `diagnosis_contains` (sous-chaîne du diagnostic), `medication_name_contains` (sous-chaîne du médicament).

---

## Ajouter une nouvelle page

1. Créer `apps/web/src/pages/PageName.tsx`
2. Ajouter la route dans `apps/web/src/App.tsx`
3. Ajouter l'entrée de navigation dans `apps/web/src/components/Layout.tsx`
4. Ajouter les clés de traduction dans `apps/web/src/i18n/en.ts` et `ko.ts`
5. Ajouter les endpoints dans `apps/server/src/index.ts` et les fonctions typées dans `apps/web/src/api/client.ts`

---

## Exactitude médicale

- Citer les sources primaires (`source_url` + `version_date`)
- Utiliser un langage accessible aux patients, pas de jargon clinique
- Exprimer l'incertitude : « peut indiquer », « consultez votre médecin »
- Ne jamais poser un diagnostic — décrire les résultats et recommander un suivi

---

## Style de code

- TypeScript uniquement, `any` interdit sauf cas exceptionnel
- Pas de commentaires si le POURQUOI n'est pas évident
- Pages de moins de 250 lignes
- Accès à la base de données uniquement via Drizzle ORM
