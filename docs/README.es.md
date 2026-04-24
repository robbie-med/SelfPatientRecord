# HealthBinder

**Idioma:** [🇺🇸 English](../README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇪🇸 Español](#) · [🇧🇷 Português](README.pt-br.md) · [🇹🇷 Türkçe](README.tr.md) · [🇨🇳 中文](README.zh.md) · [🇷🇺 Русский](README.ru.md)

---

Un historial médico personal de uso local, propiedad del paciente, con asistente de IA. Sus datos se almacenan en una base de datos SQLite en su propio equipo.

**No es un dispositivo médico. No cumple HIPAA. No usar en emergencias.**

---

## Funcionalidades

- **Bandeja de entrada** — Pegue cualquier documento médico (resultados de laboratorio, informes de alta, recetas). La IA extrae datos estructurados; usted confirma antes de guardar.
- **Análisis y constantes** — Resultados agrupados por panel, gráficos de tendencia y explicaciones en lenguaje sencillo de 20 análisis comunes.
- **Imágenes médicas** — Guarde informes radiológicos con vista expandible. Busque términos (atelectasia, derrame pleural, etc.) para obtener explicaciones accesibles.
- **Medicamentos** — Medicación actual y anterior, alergias, lista imprimible.
- **Prevención** — Brechas de atención detectadas automáticamente, guías clínicas (USPSTF/ADA/AHA/semFYC), registro de vacunas.
- **Consultar mi historial** — Converse con sus datos confirmados mediante IA (desactivado por defecto).
- **Configuración** — Perfil, país/organización de referencia, configuración de IA, módulos, exportación/eliminación de datos.

---

## Instalación

```bash
git clone <url-del-repositorio>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- Aplicación web: http://localhost:5173
- Servidor API: http://localhost:3001

### Variables de entorno (`.env`)

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del servidor API |
| `AI_ENABLED` | `false` | Activar funciones de IA (`true`) |
| `AI_API_KEY` | — | Clave API compatible con OpenAI |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Endpoint de la API |
| `AI_MODEL` | `gpt-4o-mini` | Nombre del modelo |

Todas las funciones principales (entrada manual, gráficos, guías, brechas de atención) funcionan sin IA.

---

## GitHub Codespaces

1. Repositorio GitHub → **Code** → **Codespaces** → **Create codespace**
2. Espere a que finalice `npm install` (~1 min)
3. En el terminal: `npm run dev`
4. Codespaces abre automáticamente el navegador en el puerto 5173

---

## Contribuir

Consulte [CONTRIBUTING.es.md](CONTRIBUTING.es.md) para saber cómo añadir paquetes de guías por país, disparadores de módulos clínicos o explicaciones de análisis.

---

## Aviso legal

HealthBinder es una herramienta de organización de salud personal. No es un dispositivo médico ni sustituye la atención médica profesional. En caso de emergencia, llame al 112 (España) o al número de emergencias local.
