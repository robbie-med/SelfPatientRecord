# HealthBinder

**语言:** [🇺🇸 English](../README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇪🇸 Español](README.es.md) · [🇧🇷 Português](README.pt-br.md) · [🇹🇷 Türkçe](README.tr.md) · [🇨🇳 中文](#) · [🇷🇺 Русский](README.ru.md)

---

一款本地优先、患者自主掌控的个人健康档案与AI健康助手。您的数据存储在本地设备的SQLite数据库中。

**非医疗器械。不符合HIPAA。请勿在紧急情况下使用。**

---

## 主要功能

- **收件箱** — 粘贴任意医疗文件（检验报告、出院小结、处方等）。AI提取结构化信息，由您确认后方可保存。
- **检验结果** — 按检验组合分类展示、趋势图表，以及20种常见检查项目的通俗语言解释。
- **影像检查** — 保存影像报告，可展开查看全文。搜索术语（肺不张、胸腔积液等）获取易懂解释。
- **药物** — 当前及既往用药、过敏史、可打印药物清单。
- **预防保健** — 自动识别的医疗缺口、各国指南（NHSA/USPSTF/ADA/中华医学会等）、疫苗记录。
- **询问我的档案** — 基于已确认的健康数据与AI对话（默认关闭）。
- **设置** — 个人信息、指南国家/机构偏好、AI配置、模块开关、数据导出/删除。

---

## 安装方法

```bash
git clone <仓库地址>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- 网页应用：http://localhost:5173
- API服务器：http://localhost:3001

### 环境变量（`.env`）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3001` | API服务器端口 |
| `AI_ENABLED` | `false` | 启用AI功能（设为`true`） |
| `AI_API_KEY` | — | OpenAI兼容API密钥 |
| `AI_BASE_URL` | `https://api.openai.com/v1` | API端点 |
| `AI_MODEL` | `gpt-4o-mini` | 模型名称 |

所有核心功能（手动录入、图表、指南、医疗缺口）均可在不启用AI的情况下正常使用。

---

## GitHub Codespaces

1. GitHub仓库 → **Code** → **Codespaces** → **Create codespace**
2. 等待 `npm install` 完成（约1分钟）
3. 在终端运行：`npm run dev`
4. Codespaces将自动在5173端口打开浏览器

---

## 参与贡献

请参阅 [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md)，了解如何添加国家指南包、临床模块触发器或检查项目解释。

---

## 免责声明

HealthBinder是个人健康整理工具，不是医疗器械，不能替代专业医疗服务。紧急情况请拨打120（急救）或119（消防）。AI功能会将数据发送至外部服务，请知悉。
