# HealthBinder

**언어:** [🇺🇸 English](../README.md) · [🇰🇷 한국어](#) · [🇯🇵 日本語](README.ja.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md) · [🇪🇸 Español](README.es.md) · [🇧🇷 Português](README.pt-br.md) · [🇹🇷 Türkçe](README.tr.md) · [🇨🇳 中文](README.zh.md) · [🇷🇺 Русский](README.ru.md)

---

개인이 소유하고 로컬에서 실행되는 개인 건강 기록 및 AI 건강 정리 도구입니다. 데이터는 사용자의 기기에 있는 SQLite 데이터베이스에 저장됩니다.

**의료기기가 아닙니다. HIPAA를 준수하지 않습니다. 응급 상황에는 사용하지 마세요.**

---

## 주요 기능

- **받은 기록** — 진료 기록, 검사 결과지, 처방전 등을 붙여 넣으면 AI가 구조화된 정보를 추출합니다. 저장 전에 사용자가 직접 확인합니다.
- **검사 결과** — 패널별로 정리된 검사 수치, 추세 차트, 20가지 일반 검사에 대한 알기 쉬운 설명.
- **영상 검사** — X선, CT, MRI, 초음파 결과 저장. 무기폐(atelectasis), 흉수(pleural effusion) 등 방사선 용어를 쉬운 말로 설명.
- **복용 약물** — 현재 및 이전 복용 약물, 알레르기, 인쇄용 약물 목록.
- **예방 관리** — 자동으로 감지된 케어 갭, USPSTF·CDC·ADA·ACOG·KDCA 가이드라인, 예방접종 기록.
- **기록에 질문하기** — 확인된 건강 데이터를 바탕으로 AI와 대화 (기본값: 비활성화).
- **설정** — 프로필, 가이드라인 국가/기관 설정, AI 구성, 모듈 토글, 데이터 내보내기/삭제.

---

## 설치 방법

```bash
git clone <저장소-URL>
cd SelfPatientRecord
npm install
cp .env.example .env
npm run dev
```

- 웹 앱: http://localhost:5173
- API 서버: http://localhost:3001

### 환경 변수 (`.env`)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `3001` | API 서버 포트 |
| `AI_ENABLED` | `false` | AI 기능 활성화 (`true`로 설정) |
| `AI_API_KEY` | — | OpenAI 호환 API 키 |
| `AI_BASE_URL` | `https://api.openai.com/v1` | API 엔드포인트 (개인정보 보호를 위해 Maple Proxy 사용 가능) |
| `AI_MODEL` | `gpt-4o-mini` | 모델 이름 |

AI 기능 없이도 수동 입력, 검사 차트, 가이드라인, 케어 갭 등 모든 핵심 기능을 사용할 수 있습니다.

---

## GitHub Codespaces에서 실행

1. GitHub 저장소 → **Code** → **Codespaces** → **Create codespace**
2. `npm install` 완료까지 대기 (~1분)
3. 터미널에서 `npm run dev` 실행
4. Codespaces가 포트 5173에서 브라우저를 자동으로 엽니다

---

## 기여하기

[CONTRIBUTING.ko.md](CONTRIBUTING.ko.md)를 참고하세요. 국가별 가이드라인 패키지, 임상 모듈 트리거, 검사/영상 설명 추가 방법이 안내되어 있습니다.

---

## 면책 조항

HealthBinder는 개인 건강 정리 도구입니다. 의료기기가 아니며, 의학적 조언을 제공하지 않습니다. 전문 의료진을 대체할 수 없습니다. 응급 상황에는 즉시 119에 신고하세요. AI 기능은 데이터를 외부 서비스로 전송합니다.
