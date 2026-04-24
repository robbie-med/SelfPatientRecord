# HealthBinder

**Língua:** [🇺🇸 English](../README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇪🇸 Español](README.es.md) · [🇧🇷 Português](#) · [🇹🇷 Türkçe](README.tr.md) · [🇨🇳 中文](README.zh.md) · [🇷🇺 Русский](README.ru.md)

---

Um prontuário médico pessoal local, de propriedade do paciente, com assistente de IA. Seus dados ficam em um banco de dados SQLite no seu próprio dispositivo.

**Não é um dispositivo médico. Não é compatível com HIPAA. Não usar em emergências.**

---

## Funcionalidades

- **Caixa de entrada** — Cole qualquer documento médico (resultados de exames, resumo de alta, receitas). A IA extrai dados estruturados; você confirma antes de salvar.
- **Exames e Sinais Vitais** — Resultados agrupados por painel, gráficos de tendência e explicações em linguagem simples para 20 exames comuns.
- **Imagens Médicas** — Salve laudos radiológicos. Pesquise termos (atelectasia, derrame pleural etc.) para obter explicações acessíveis.
- **Medicamentos** — Medicações atuais e anteriores, alergias, lista para impressão.
- **Prevenção** — Lacunas de cuidado detectadas automaticamente, diretrizes clínicas (INCA/USPSTF/ADA/SBC), carteira de vacinação.
- **Consultar meu prontuário** — Converse com seus dados confirmados via IA (desativado por padrão).
- **Configurações** — Perfil, país/organização de referência, configuração de IA, módulos, exportação/exclusão de dados.

---

## Instalação

```bash
git clone <url-do-repositório>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- Aplicação web: http://localhost:5173
- Servidor API: http://localhost:3001

### Variáveis de ambiente (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta do servidor API |
| `AI_ENABLED` | `false` | Ativar funções de IA (`true`) |
| `AI_API_KEY` | — | Chave de API compatível com OpenAI |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Endpoint da API |
| `AI_MODEL` | `gpt-4o-mini` | Nome do modelo |

Todas as funções principais funcionam sem IA.

---

## GitHub Codespaces

1. Repositório GitHub → **Code** → **Codespaces** → **Create codespace**
2. Aguarde o `npm install` concluir (~1 min)
3. No terminal: `npm run dev`
4. O Codespaces abre automaticamente o navegador na porta 5173

---

## Contribuir

Consulte [CONTRIBUTING.pt-br.md](CONTRIBUTING.pt-br.md) para saber como adicionar pacotes de diretrizes por país, gatilhos de módulos clínicos ou explicações de exames.

---

## Aviso Legal

O HealthBinder é uma ferramenta de organização de saúde pessoal. Não é um dispositivo médico e não substitui atendimento médico profissional. Em emergências, ligue para o SAMU (192) ou Bombeiros (193).
