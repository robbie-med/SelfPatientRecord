# HealthBinder コントリビューションガイド

**言語:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](CONTRIBUTING.ko.md) · [🇯🇵 日本語](#) · [🇫🇷 Français](CONTRIBUTING.fr.md) · [🇩🇪 Deutsch](CONTRIBUTING.de.md) · [🇪🇸 Español](CONTRIBUTING.es.md) · [🇧🇷 Português](CONTRIBUTING.pt-br.md) · [🇹🇷 Türkçe](CONTRIBUTING.tr.md) · [🇨🇳 中文](CONTRIBUTING.zh.md) · [🇷🇺 Русский](CONTRIBUTING.ru.md)

---

## 国別ガイドラインパックの追加

`packages/country-packs/<国コード>/preventive-care.json` にJSONファイルを追加するだけです。サーバー起動時に自動で読み込まれます。コードの変更は不要です。

スキーマの詳細は `packages/country-packs/SCHEMA.md` を参照してください。

### 手順

1. `packages/country-packs/<ISOコード>/` ディレクトリを作成
2. `packages/country-packs/us/preventive-care.json` をテンプレートとしてコピー
3. 対象国の組織（organizations）と推奨事項（recommendations）に置き換える
4. 各項目に一意で安定したIDを使用（例：`"mhlw-colorectal-2023"`）
5. `apps/web/src/pages/Settings.tsx` の `COUNTRIES` 配列に国コードを追加（未掲載の場合）
6. サーバーを再起動すると自動で認識されます

### 参照すべき情報源

公式の国家がん検診プログラムや主要な学会資料を参照してください。すべての推奨事項に `source_url` と `version_date` を必ず含めてください。

---

## 臨床モジュールトリガーの追加

`packages/clinical-rules/src/module-triggers.json` に追加します。

```json
{
  "id": "gout",
  "name": "痛風管理",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "痛風" },
      { "medication_name_contains": "allopurinol" }
    ]
  }
}
```

条件の種類：`lab`（検査値しきい値）、`diagnosis_contains`（病名の部分一致）、`medication_name_contains`（薬剤名の部分一致）。

---

## 新しいページの追加

1. `apps/web/src/pages/PageName.tsx` を作成
2. `apps/web/src/App.tsx` にルートを追加
3. `apps/web/src/components/Layout.tsx` にナビゲーション項目を追加
4. `apps/web/src/i18n/en.ts` と `ko.ts` に翻訳キーを追加
5. 新しいAPIエンドポイントは `apps/server/src/index.ts` に、型付き関数は `apps/web/src/api/client.ts` に追加

---

## 医療情報の正確性

- 一次情報源の引用必須（`source_url` + `version_date`）
- 専門用語ではなく患者向けの言葉を使用
- 不確実性を必ず表現：「可能性があります」「医師にご相談ください」
- 診断を断定しない — 所見を説明し、フォローアップを推奨する形式で記述

---

## コードスタイル

- TypeScript のみ、やむを得ない場合を除き `any` 禁止
- 理由が明確でない限りコメント追加禁止
- ページコンポーネントは250行以内
- DB アクセスはすべて Drizzle ORM を使用（`apps/server/src/db/index.ts` を除く）
