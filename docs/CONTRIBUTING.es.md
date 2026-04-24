# Guía de contribución a HealthBinder

**Idioma:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](CONTRIBUTING.ko.md) · [🇯🇵 日本語](CONTRIBUTING.ja.md) · [🇫🇷 Français](CONTRIBUTING.fr.md) · [🇩🇪 Deutsch](CONTRIBUTING.de.md) · [🇪🇸 Español](#) · [🇧🇷 Português](CONTRIBUTING.pt-br.md) · [🇹🇷 Türkçe](CONTRIBUTING.tr.md) · [🇨🇳 中文](CONTRIBUTING.zh.md) · [🇷🇺 Русский](CONTRIBUTING.ru.md)

---

## Añadir un paquete de directrices por país

Los paquetes se encuentran en `packages/country-packs/<código-país>/preventive-care.json`. El servidor los carga automáticamente al iniciar — **solo hay que añadir el archivo JSON**, sin cambios de código.

Consulte `packages/country-packs/SCHEMA.md` para la referencia completa de campos.

### Pasos

1. Crear el directorio `packages/country-packs/<código-ISO>/`
2. Copiar `packages/country-packs/us/preventive-care.json` como plantilla
3. Sustituir las organizaciones y recomendaciones por las del país objetivo
4. Usar IDs únicos y estables (ej.: `"aepcc-cervical-2023"`)
5. Añadir el código de país en `COUNTRIES` en `apps/web/src/pages/Settings.tsx` si no está
6. Reiniciar el servidor — el archivo se reconoce automáticamente

### Fuentes recomendadas

Consulte los programas nacionales oficiales de cribado y las principales sociedades científicas (semFYC, PAPPS, SEO, SEGO). Incluya `source_url` y `version_date` en cada recomendación.

---

## Añadir un disparador de módulo clínico

Los disparadores están en `packages/clinical-rules/src/module-triggers.json`.

```json
{
  "id": "gota",
  "name": "Manejo de la gota",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "gota" },
      { "medication_name_contains": "alopurinol" }
    ]
  }
}
```

Tipos de condición: `lab` (umbral de análisis), `diagnosis_contains` (subcadena del diagnóstico), `medication_name_contains` (subcadena del medicamento).

---

## Añadir una nueva página

1. Crear `apps/web/src/pages/NombrePagina.tsx`
2. Añadir ruta en `apps/web/src/App.tsx`
3. Añadir entrada de navegación en `apps/web/src/components/Layout.tsx`
4. Añadir claves de traducción en `apps/web/src/i18n/en.ts` y `ko.ts`
5. Añadir endpoints en `apps/server/src/index.ts` y funciones tipadas en `apps/web/src/api/client.ts`

---

## Exactitud médica

- Citar fuentes primarias (`source_url` + `version_date`)
- Usar lenguaje accesible para pacientes, sin jerga clínica
- Expresar incertidumbre: «puede indicar», «consulte a su médico»
- Nunca afirmar un diagnóstico — describir hallazgos y recomendar seguimiento

---

## Estilo de código

- Solo TypeScript, `any` prohibido salvo caso excepcional
- Sin comentarios a menos que el PORQUÉ no sea obvio
- Páginas de menos de 250 líneas
- Acceso a la base de datos solo mediante Drizzle ORM
