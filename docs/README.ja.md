# HealthBinder

**言語:** [🇺🇸 English](../README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](#) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇪🇸 Español](README.es.md) · [🇧🇷 Português](README.pt-br.md) · [🇹🇷 Türkçe](README.tr.md) · [🇨🇳 中文](README.zh.md) · [🇷🇺 Русский](README.ru.md)

---

ローカル優先・患者所有の個人健康記録ツールです。データはお使いの端末上のSQLiteデータベースに保存されます。

**医療機器ではありません。HIPAA準拠ではありません。緊急時には使用しないでください。**

---

## 主な機能

- **受信トレイ** — 診療記録、検査結果、処方箋などを貼り付けると、AIが構造化された情報を抽出します。保存前にユーザーが確認します。
- **検査結果** — パネル別に整理された検査値、トレンドグラフ、20種類の一般的な検査に関するわかりやすい説明。
- **画像検査** — X線・CT・MRI・超音波の結果を保存。無気肺（atelectasis）・胸水（pleural effusion）など放射線用語をわかりやすく解説。
- **服用薬** — 現在および過去の薬、アレルギー、印刷用薬リスト。
- **予防管理** — 自動検出されたケアギャップ、各国ガイドライン（USPSTF・CDC・ADA・ACOG・厚生労働省等）、ワクチン接種記録。
- **記録に質問する** — 確認済みの健康データをもとにAIと対話（デフォルト：無効）。
- **設定** — プロフィール、ガイドラインの国・機関設定、AI設定、モジュール切り替え、データのエクスポート・削除。

---

## インストール方法

```bash
git clone <リポジトリURL>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- Webアプリ: http://localhost:5173
- APIサーバー: http://localhost:3001

### 環境変数 (`.env`)

| 変数 | デフォルト | 説明 |
|---|---|---|
| `PORT` | `3001` | APIサーバーポート |
| `AI_ENABLED` | `false` | AI機能を有効化（`true`に設定） |
| `AI_API_KEY` | — | OpenAI互換APIキー |
| `AI_BASE_URL` | `https://api.openai.com/v1` | APIエンドポイント |
| `AI_MODEL` | `gpt-4o-mini` | モデル名 |

AI機能なしでも、手動入力・検査グラフ・ガイドライン・ケアギャップなどすべての主要機能が使用できます。

---

## GitHub Codespacesでの実行

1. GitHubリポジトリ → **Code** → **Codespaces** → **Create codespace**
2. `npm install`の完了を待つ（約1分）
3. ターミナルで `npm run dev` を実行
4. Codespacesがポート5173でブラウザを自動的に開きます

---

## コントリビュート

[CONTRIBUTING.ja.md](CONTRIBUTING.ja.md)をご参照ください。国別ガイドラインパック、臨床モジュールトリガー、検査・画像用語の説明追加方法が記載されています。

---

## 免責事項

HealthBinderは個人健康整理ツールです。医療機器ではなく、医学的アドバイスを提供するものではありません。専門医の診察に代わるものではありません。緊急時は直ちに119番（または地域の緊急番号）に連絡してください。
