# Руководство по участию в разработке HealthBinder

**Язык:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](CONTRIBUTING.ko.md) · [🇯🇵 日本語](CONTRIBUTING.ja.md) · [🇫🇷 Français](CONTRIBUTING.fr.md) · [🇩🇪 Deutsch](CONTRIBUTING.de.md) · [🇪🇸 Español](CONTRIBUTING.es.md) · [🇧🇷 Português](CONTRIBUTING.pt-br.md) · [🇹🇷 Türkçe](CONTRIBUTING.tr.md) · [🇨🇳 中文](CONTRIBUTING.zh.md) · [🇷🇺 Русский](#)

---

## Добавление пакета рекомендаций по стране

Пакеты находятся в `packages/country-packs/<код-страны>/preventive-care.json`. Сервер загружает их автоматически при запуске — **достаточно добавить JSON-файл**, изменения в коде не требуются.

Полное описание полей см. в `packages/country-packs/SCHEMA.md`.

### Шаги

1. Создать директорию `packages/country-packs/<ISO-код>/`
2. Скопировать `packages/country-packs/us/preventive-care.json` как шаблон
3. Заменить организации и рекомендации на соответствующие для целевой страны
4. Использовать уникальные и стабильные идентификаторы (напр.: `"minzdrav-colorectal-2023"`)
5. Добавить код страны в массив `COUNTRIES` в `apps/web/src/pages/Settings.tsx`, если его там нет
6. Перезапустить сервер — файл будет распознан автоматически

### Рекомендуемые источники

Официальные программы диспансеризации (Минздрав России), национальные онкологические программы и крупные профессиональные общества (РНМОТ, РКО, РОАГ). Каждая рекомендация должна содержать `source_url` и `version_date`.

---

## Добавление триггера клинического модуля

Триггеры находятся в `packages/clinical-rules/src/module-triggers.json`.

```json
{
  "id": "gout",
  "name": "Ведение подагры",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "подагра" },
      { "medication_name_contains": "аллопуринол" }
    ]
  }
}
```

Типы условий: `lab` (пороговое значение анализа), `diagnosis_contains` (подстрока диагноза), `medication_name_contains` (подстрока названия препарата).

---

## Добавление новой страницы

1. Создать `apps/web/src/pages/PageName.tsx`
2. Добавить маршрут в `apps/web/src/App.tsx`
3. Добавить пункт навигации в `apps/web/src/components/Layout.tsx`
4. Добавить ключи перевода в `apps/web/src/i18n/en.ts` и `ko.ts`
5. Добавить API-эндпоинты в `apps/server/src/index.ts`, типизированные функции — в `apps/web/src/api/client.ts`

---

## Медицинская точность

- Обязательное цитирование первичных источников (`source_url` + `version_date`)
- Использовать язык, понятный пациентам, без клинического жаргона
- Выражать неопределённость: «может свидетельствовать о», «проконсультируйтесь с врачом»
- Никогда не ставить диагноз — описывать данные и рекомендовать дообследование

---

## Стиль кода

- Только TypeScript, `any` запрещён без веской причины
- Комментарии только если ПОЧЕМУ неочевидно
- Компоненты страниц — не более 250 строк
- Доступ к БД только через Drizzle ORM
