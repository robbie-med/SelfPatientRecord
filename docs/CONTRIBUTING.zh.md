# HealthBinder 贡献指南

**语言:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](CONTRIBUTING.ko.md) · [🇯🇵 日本語](CONTRIBUTING.ja.md) · [🇫🇷 Français](CONTRIBUTING.fr.md) · [🇩🇪 Deutsch](CONTRIBUTING.de.md) · [🇪🇸 Español](CONTRIBUTING.es.md) · [🇧🇷 Português](CONTRIBUTING.pt-br.md) · [🇹🇷 Türkçe](CONTRIBUTING.tr.md) · [🇨🇳 中文](#) · [🇷🇺 Русский](CONTRIBUTING.ru.md)

---

## 添加国家指南包

指南包位于 `packages/country-packs/<国家代码>/preventive-care.json`。服务器启动时会自动读取——**只需添加JSON文件**，无需修改代码。

完整字段说明请参阅 `packages/country-packs/SCHEMA.md`。

### 步骤

1. 创建目录 `packages/country-packs/<ISO代码>/`
2. 复制 `packages/country-packs/us/preventive-care.json` 作为模板
3. 将组织（organizations）和建议（recommendations）替换为目标国家的内容
4. 使用唯一且稳定的ID（例如：`"nhsa-gastric-2023"`）
5. 如果 `apps/web/src/pages/Settings.tsx` 中的 `COUNTRIES` 数组没有该国家，请添加
6. 重启服务器——文件将被自动识别

### 推荐来源

请参考官方国家筛查项目（国家卫生健康委员会、各省卫健委）和主要医学会（中华医学会、中国医师协会等）。每条建议必须包含 `source_url` 和 `version_date`。

---

## 添加临床模块触发器

触发器位于 `packages/clinical-rules/src/module-triggers.json`。

```json
{
  "id": "gout",
  "name": "痛风管理",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "痛风" },
      { "medication_name_contains": "别嘌醇" }
    ]
  }
}
```

条件类型：`lab`（检验值阈值）、`diagnosis_contains`（诊断子字符串匹配）、`medication_name_contains`（药物名称子字符串匹配）。

---

## 添加新页面

1. 创建 `apps/web/src/pages/PageName.tsx`
2. 在 `apps/web/src/App.tsx` 中添加路由
3. 在 `apps/web/src/components/Layout.tsx` 中添加导航项
4. 在 `apps/web/src/i18n/en.ts` 和 `ko.ts` 中添加翻译键
5. 在 `apps/server/src/index.ts` 中添加API端点，在 `apps/web/src/api/client.ts` 中添加类型函数

---

## 医疗内容准确性

- 必须引用一手资料（`source_url` + `version_date`）
- 使用患者友好的语言，避免医学术语
- 表达不确定性："可能提示"、"请咨询您的医生"
- 禁止作出诊断——描述检查结果并建议随访

---

## 代码风格

- 全程使用TypeScript，非必要情况禁止使用 `any`
- 非必要不写注释（只在"为什么"不明显时添加）
- 页面组件保持在250行以内
- 数据库访问一律通过Drizzle ORM
