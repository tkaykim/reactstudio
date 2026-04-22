# 재무 모듈 브라우저 테스트 결과

실행일: 2026-04-22
실행 환경: `http://localhost:3000` (Next dev)
실행 계정: HEAD 관리자 (`tommy0621@naver.com`)
자동화 도구: Claude in Chrome MCP

## 요약

| 섹션 | 결과 |
|---|---|
| 1.1~1.2 인증 (HEAD) | PASS |
| 2. URL 리다이렉트 5건 | PASS (next.config.ts 재정렬 후) |
| 3. 재무 허브 네비게이션 | PASS |
| 4. 지급(Payables) CRUD | PASS |
| 5. 수금(Receivables) CRUD | PASS |
| 6. 대시보드 계산 (6.2/6.3/6.5/6.7) | PASS |
| 7. 프로젝트별 집계 | PASS |
| 8. 인원별 집계 | PASS |
| 11. HEAD 접근 권한 | PASS |
| 1.3~1.7, 9, 10 | N/A (다른 역할 계정 필요) |

## 발견된 이슈 및 수정 내역

### 이슈 1 — URL 리다이렉트 wildcard 순서 버그
- 증상: `/admin/payments/by-payee`, `/admin/payments/by-project`가
  `/admin/payments/:id` wildcard에 먼저 매칭되어 잘못된 경로로 이동.
- 수정: `next.config.ts`에서 specific 규칙을 `:id` wildcard 앞으로 재정렬.

### 이슈 2 — `financial_entries.project_id` NOT NULL
- 증상: 프로젝트 선택 없이 지급/수금 등록 시 DB 제약 위반.
- 수정: 마이그레이션 `ALTER TABLE financial_entries ALTER COLUMN project_id DROP NOT NULL`.

### 이슈 3 — `financial_entries.category` NOT NULL
- 증상: 카테고리 미입력 시 DB 제약 위반.
- 수정: 마이그레이션 `ALTER TABLE financial_entries ALTER COLUMN category DROP NOT NULL`.

## 대시보드 계산 검증 세부

테스트 데이터:
- 수금 planned 1,000,000원 (예정일 2026-04-25)
- 지급 planned 500,000원 (예정일 2026-04-25)
- 지급 planned 500,000원 (예정일 2026-04-21, 연체)

결과:
- 이번 주 수금 예정 카드: **1,000,000원** 표시 (+1,000,000)
- 이번 주 지급 예정 카드: **500,000원** 표시 (+500,000)
- 연체/임박 카드: 지급 **1건 · 500,000원** (빨간색)
- 다가오는 2주 이내 테이블: 연체 건 "1일 연체" 텍스트 + 빨간색 배지 + 예정일순 정렬 OK

## 수행 범위 제한

- 6.4 14일 차트 hover title, 6.6 paid 처리 후 순현금흐름 색상 분기는
  수동 hover 검증 / 추가 paid 처리가 필요하므로 본 실행에서는 생략 (차트 바 자체 렌더링은 확인).
- Section 9 (`/me/earnings`), 10 (가입 플로우)은 아티스트/매니저/가입대기 계정이 없어 스킵.
- Section 11 매트릭스 중 HEAD 계정만 검증. REACT 매니저 측 차단은 후속.
