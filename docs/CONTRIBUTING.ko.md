# HealthBinder 기여 가이드

**언어:** [🇺🇸 English](../CONTRIBUTING.md) · [🇰🇷 한국어](#) · [🇯🇵 日本語](CONTRIBUTING.ja.md) · [🇫🇷 Français](CONTRIBUTING.fr.md) · [🇩🇪 Deutsch](CONTRIBUTING.de.md) · [🇪🇸 Español](CONTRIBUTING.es.md) · [🇧🇷 Português](CONTRIBUTING.pt-br.md) · [🇹🇷 Türkçe](CONTRIBUTING.tr.md) · [🇨🇳 中文](CONTRIBUTING.zh.md) · [🇷🇺 Русский](CONTRIBUTING.ru.md)

---

## 국가별 가이드라인 패키지 추가

국가별 가이드라인은 `packages/country-packs/<국가코드>/preventive-care.json` 형식으로 관리됩니다. 서버가 시작될 때 자동으로 읽어 SQLite에 저장하므로, **JSON 파일만 추가하면 됩니다.**

스키마 전체 설명은 `packages/country-packs/SCHEMA.md`를 참고하세요.

### 추가 방법

1. `packages/country-packs/<ISO코드>/` 디렉토리 생성
2. `packages/country-packs/us/preventive-care.json`을 템플릿으로 복사
3. 해당 국가의 기관(organizations)과 권고사항(recommendations)으로 교체
4. 각 항목에 고유하고 안정적인 ID 사용 (예: `"kdca-gastric-2023"`)
5. `apps/web/src/pages/Settings.tsx`의 `COUNTRIES` 배열에 없으면 국가 코드 추가
6. 서버를 재시작하면 시더(seeder)가 자동으로 파일을 인식합니다

### 권장 출처

공식 국가 건강검진 프로그램 및 주요 학회를 참고하세요. 모든 권고사항에 `source_url`과 `version_date`를 포함해야 합니다.

---

## 임상 모듈 트리거 추가

모듈 트리거는 `packages/clinical-rules/src/module-triggers.json`에 정의되어 있습니다.

```json
{
  "id": "gout",
  "name": "통풍 관리",
  "trigger": {
    "any": [
      { "lab": "uric acid", "operator": ">=", "value": 6.8 },
      { "diagnosis_contains": "통풍" },
      { "medication_name_contains": "allopurinol" }
    ]
  }
}
```

조건 유형: `lab` (검사 수치 임계값), `diagnosis_contains` (진단명 포함 여부), `medication_name_contains` (약물명 포함 여부).

---

## 새 페이지 추가

1. `apps/web/src/pages/PageName.tsx` 생성
2. `apps/web/src/App.tsx`에 라우트 추가
3. `apps/web/src/components/Layout.tsx`에 내비게이션 항목 추가
4. `apps/web/src/i18n/en.ts` 및 `ko.ts`에 번역 키 추가
5. 필요한 API 엔드포인트는 `apps/server/src/index.ts`에, 타입 함수는 `apps/web/src/api/client.ts`에 추가

---

## 의료 정보 정확성

- 1차 출처 인용 필수 (`source_url` + `version_date`)
- 전문 용어 대신 환자 친화적인 표현 사용
- 불확실성 표현 필수: "가능성이 있습니다", "의사와 상담하세요"
- 진단 단정 금지 — 검사 결과를 설명하고 추가 검진을 권유하는 방식으로 작성

---

## 코드 스타일

- TypeScript 전용, 불가피한 경우 외 `any` 사용 금지
- 이유가 명확하지 않은 경우 주석 추가 금지
- 페이지 컴포넌트는 250줄 이내로 유지
- Drizzle ORM을 통해서만 DB 접근 (`apps/server/src/db/index.ts` 제외)
