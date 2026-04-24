# Guia de contribuição ao HealthBinder

**Língua:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](CONTRIBUTING.ko.md) · [🇯🇵 日本語](CONTRIBUTING.ja.md) · [🇫🇷 Français](CONTRIBUTING.fr.md) · [🇩🇪 Deutsch](CONTRIBUTING.de.md) · [🇪🇸 Español](CONTRIBUTING.es.md) · [🇧🇷 Português](#) · [🇹🇷 Türkçe](CONTRIBUTING.tr.md) · [🇨🇳 中文](CONTRIBUTING.zh.md) · [🇷🇺 Русский](CONTRIBUTING.ru.md)

---

## Adicionar pacote de diretrizes por país

Os pacotes ficam em `packages/country-packs/<código-país>/preventive-care.json`. O servidor carrega automaticamente ao iniciar — **basta adicionar o arquivo JSON**, sem alterações no código.

Consulte `packages/country-packs/SCHEMA.md` para a referência completa dos campos.

### Passos

1. Criar o diretório `packages/country-packs/<código-ISO>/`
2. Copiar `packages/country-packs/us/preventive-care.json` como modelo
3. Substituir as organizações e recomendações pelas do país alvo
4. Usar IDs únicos e estáveis (ex.: `"inca-colorectal-2023"`)
5. Adicionar o código do país em `COUNTRIES` em `apps/web/src/pages/Settings.tsx` se ainda não constar
6. Reiniciar o servidor — o arquivo será reconhecido automaticamente

### Fontes recomendadas

Consulte os programas nacionais oficiais de rastreamento (INCA, Ministério da Saúde) e as principais sociedades médicas brasileiras (CFM, SBC, FEBRASGO). Inclua `source_url` e `version_date` em cada recomendação.

---

## Adicionar um gatilho de módulo clínico

Os gatilhos ficam em `packages/clinical-rules/src/module-triggers.json`.

```json
{
  "id": "gota",
  "name": "Manejo da Gota",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "gota" },
      { "medication_name_contains": "alopurinol" }
    ]
  }
}
```

Tipos de condição: `lab` (limite de exame), `diagnosis_contains` (substring do diagnóstico), `medication_name_contains` (substring do medicamento).

---

## Adicionar uma nova página

1. Criar `apps/web/src/pages/NomePagina.tsx`
2. Adicionar rota em `apps/web/src/App.tsx`
3. Adicionar item de navegação em `apps/web/src/components/Layout.tsx`
4. Adicionar chaves de tradução em `apps/web/src/i18n/en.ts` e `ko.ts`
5. Adicionar endpoints em `apps/server/src/index.ts` e funções tipadas em `apps/web/src/api/client.ts`

---

## Precisão médica

- Citar fontes primárias (`source_url` + `version_date`)
- Usar linguagem acessível ao paciente, sem jargão clínico
- Expressar incerteza: «pode indicar», «consulte seu médico»
- Nunca afirmar um diagnóstico — descrever achados e recomendar acompanhamento

---

## Estilo de código

- Somente TypeScript, `any` proibido salvo exceção
- Sem comentários a menos que o PORQUÊ não seja óbvio
- Páginas com menos de 250 linhas
- Acesso ao banco de dados somente via Drizzle ORM
