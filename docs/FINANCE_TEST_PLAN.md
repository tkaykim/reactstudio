# 재무 모듈 브라우저 테스트 플랜

실제 브라우저(Claude in Chrome / Claude Preview MCP)로 실행하는 검증 시나리오.
**실행자는 이 문서를 순서대로 따라가며 각 단계의 "기대 결과"와 실제 화면을 비교**하고, 불일치 시 파일 경로/쿼리/콘솔 오류를 캡처하여 리포트한다.

---

## 0. 준비

### 0.1 환경
- 프로덕션 URL: `https://<배포 도메인>/` (Vercel 등)
- 로컬 확인 필요 시: `npm run dev` → `http://localhost:3000`

### 0.2 필요한 테스트 계정
| 역할 | bu_code | role | status | 용도 |
|---|---|---|---|---|
| HEAD 관리자 | HEAD | admin | active | 재무 전체 권한 (tommy0621@naver.com이 여기 해당) |
| REACT 매니저 | REACT | manager | active | 일반 admin 가능 / 재무 불가 |
| 아티스트 | null 또는 임의 | artist 또는 member | active | `/me/earnings` 전용 |
| 가입 대기 | - | - | pending | 로그인 거부 테스트 |

Supabase MCP로 계정을 빠르게 생성·설정하려면:
```sql
-- 예: 기존 auth 유저에게 역할 부여
UPDATE app_users SET bu_code='REACT', role='manager', status='active'
WHERE email='test-manager@example.com';
```

### 0.3 테스트 데이터 레퍼런스
아래 시나리오에서 반복 생성하는 샘플 값:
- 금액: **1,000,000원**, **500,000원** 등 3자리 쉼표 포맷 확인용
- 날짜: **오늘+3일**, **오늘+7일**, **어제**(연체 테스트)
- 거래처/파트너: 실제 `partners` 테이블 1건 선택

---

## 1. 인증 & 로그인 분기

### 1.1 비로그인 → 관리자 페이지 접근
- **액션**: 로그아웃 상태로 `/admin/finance` 방문
- **기대**: `/admin/login`으로 리다이렉트

### 1.2 HEAD 관리자 로그인
- **액션**: `/admin/login`에서 HEAD admin 계정 로그인
- **기대**: `/admin` 대시보드 랜딩. 사이드바에 **"재무"** 메뉴 + **"회원가입 신청"** 메뉴 보임

### 1.3 REACT 매니저 로그인
- **액션**: `/admin/login`에서 REACT manager 로그인
- **기대**:
  - `/admin` 랜딩
  - 사이드바에 "재무" **보이지 않음** (headOnly)
  - 사이드바에 "회원가입 신청" **보이지 않음**

### 1.4 아티스트 로그인
- **액션**: `/admin/login`에서 artist 계정 로그인
- **기대**: `/me/earnings`로 자동 이동. 상단에 이름/이메일 + 로그아웃 버튼. 사이드바 없음.

### 1.5 가입 대기 상태 로그인
- **액션**: status='pending' 유저로 로그인 시도
- **기대**: 에러 메시지 **"가입 신청이 아직 승인되지 않았습니다."**, 세션 종료

### 1.6 비로그인 → `/me/earnings`
- **액션**: 로그아웃 상태로 `/me/earnings` 방문
- **기대**: `/admin/login?redirect=%2Fme%2Fearnings`로 리다이렉트

### 1.7 REACT 매니저 → `/admin/finance` URL 직접 입력
- **액션**: REACT manager 세션으로 `/admin/finance` 입력
- **기대**: `/admin`으로 리다이렉트 (canManagePayments 실패)

---

## 2. URL 리다이렉트 (기존 북마크 호환)

| 입력 URL | 기대 이동 경로 |
|---|---|
| `/admin/payments` | `/admin/finance/payables` |
| `/admin/payments/new` | `/admin/finance/payables/new` |
| `/admin/payments/123` | `/admin/finance/payables/123` |
| `/admin/payments/by-payee` | `/admin/finance/by-person` |
| `/admin/payments/by-project` | `/admin/finance/by-project` |

각각 HEAD 계정으로 검증. `next.config.ts`에 정의됨.

---

## 3. 재무 허브 네비게이션

HEAD 계정 기준.

### 3.1 탭 렌더링
- **액션**: `/admin/finance` 접속
- **기대**: 상단 탭 4개 — **대시보드 / 수금 / 지급 / 인원별**. 현재 `대시보드` 활성화

### 3.2 탭 이동
- 각 탭 클릭 → URL이 각각 `/admin/finance`, `/admin/finance/receivables`, `/admin/finance/payables`, `/admin/finance/by-person`으로 변경. 활성 탭 색(text-white + border-brand) 확인.

---

## 4. 지급 (Payables) CRUD

### 4.1 신규 지급 등록
- **액션**: `/admin/finance/payables/new` 진입 → 폼 작성
  - 프로젝트: 임의 선택 (없어도 가능)
  - 수신자 유형: "외부 파트너" → 파트너 검색 후 선택
  - 항목명: `테스트 지급`, 카테고리: `촬영`
  - 금액: `500000`, 예정일: **오늘+7일**
  - 지급 방식: 선택, 지분율: 공란, 메모: 공란
  - 저장
- **기대**: 목록으로 리다이렉트, 신규 행 상단 근처에 표시. 공급가액 `500,000원`, 실지급액 `-`, 상태 `지급 예정`

### 4.2 목록 검색/필터/페이지네이션
- 상단 검색 입력에 파트너 이름 일부 타이핑 → 해당 행만 필터링
- 상태 필터 `지급 예정` 클릭 → planned만 남음
- (20건 초과 시) 페이지네이션 `< 1/2 >` 동작 확인

### 4.3 상세 진입 & 편집
- 목록의 `상세` 링크 클릭 → 폼에 저장값 로드
- 항목명 `테스트 지급 (수정)`으로 변경 → 저장 → 목록에 반영

### 4.4 지급 완료 처리
- **액션**: 상세 화면 상단 `지급 완료` 섹션에서
  - 실지급액: `480000`
  - 증빙 참조: `이체-2025-04-22`
  - `지급 완료` 버튼 클릭
- **기대**: 상태 `지급 완료`. 목록에서 공급가액 500,000 / 실지급액 480,000(초록). 상단 요약카드 `실지급액 합계` 변동.

### 4.5 삭제
- 상세에서 `삭제` → 확인 → 목록으로 이동, 행 삭제 확인

---

## 5. 수금 (Receivables) CRUD

### 5.1 신규 수금 등록
- **액션**: `/admin/finance/receivables/new` → 폼 작성
  - 프로젝트: 임의 선택
  - 거래처: `삼성전자`
  - 항목명: `1차 계약금`, 구분: `계약금`
  - 공급가액: `3000000`, 수금예정일: **오늘+10일**
  - 수금 방식, 메모 공란
  - 저장
- **기대**: 목록에 신규 행 — 거래처 `삼성전자`, 구분 `계약금`, 공급가액 `3,000,000원`, 상태 `지급 예정`(= planned 레이블)

### 5.2 수금 완료
- 상세 진입 → `실수금액 3000000` + 증빙 참조 입력 → `수금 완료`
- **기대**: 상태 `지급 완료`(paid), 실수금액 초록색 3,000,000원

### 5.3 삭제 & 편집
- 편집: 항목명 변경 후 저장, 목록 반영 확인
- 삭제: 확인 후 목록에서 제거

---

## 6. 재무 대시보드 계산 검증

### 6.1 세팅
이 시나리오는 대시보드 수치를 재현 가능하게 검증하기 위해 **기존 데이터를 배제**하고 새로 등록한 2건의 효과만 확인하는 것을 권장. 실제 운영 데이터에서는 증감만 관찰.

### 6.2 이번 주 수금 예정
- **액션**: 수금 planned 생성 (공급가액 1,000,000원, 예정일 오늘+3)
- **기대**: `/admin/finance` 상단 카드 `이번 주 수금 예정` +1,000,000 증가

### 6.3 이번 주 지급 예정
- **액션**: 지급 planned 생성 (500,000원, 예정일 오늘+3)
- **기대**: 상단 카드 `이번 주 지급 예정` +500,000 증가

### 6.4 14일 현금흐름 차트
- 오늘+3일의 바에 녹색(수금)/빨강(지급) 모두 표시. hover title에 각 금액 표기.
- 주말 (토/일) 열은 투명도 낮게 (opacity-40) 렌더.

### 6.5 연체 카운트
- **액션**: 지급 planned 1건 생성, 예정일 = **어제**
- **기대**: `연체 / 임박` 카드 `지급 1건 · 500,000원` 빨간색.

### 6.6 이번 달 순현금흐름
- **액션**: 위 수금 1,000,000 paid 처리, 지급 500,000 paid 처리 (오늘 날짜)
- **기대**: 
  - `이번 달 순현금흐름` 카드: 수금 +1,000,000 / 지급 −500,000 / 순 +500,000 (녹색)
  - 순현금흐름 양수 → 녹색 표시

### 6.7 다가오는 2주 이내 통합 테이블
- 위에서 만든 planned 건들이 유형별 배지(녹색 "수금" / 빨강 "지급")와 함께 예정일순으로 정렬. 연체 건은 예정일 빨간색 + `N일 연체` 텍스트.

---

## 7. 프로젝트별 집계

### 7.1 기본 렌더링
- **액션**: `/admin/finance/by-project`
- **기대**: 상단 3개 요약카드 (총 수금 / 총 지급 / 합산 예상 순이익). 테이블에 프로젝트별 수금 예정/완료, 지급 예정/완료, 순이익, 마진율 컬럼

### 7.2 수익성 계산
- 준비: 프로젝트 A에 수금 planned 2,000,000 + 지급 planned 1,500,000
- 해당 행 값:
  - 수금 예정: 2,000,000
  - 지급 예정: 1,500,000
  - 순이익: **+500,000**
  - 마진율: 25% (yellow-400 색상)

### 7.3 마진 색상 분기
| 마진 | 색 |
|---|---|
| ≥30% | green-400 |
| ≥10% | yellow-400 |
| <10% | red-400 |

### 7.4 내역 보기 링크
- 테이블의 `지급` / `수금` 링크 클릭 → 각각 `/admin/finance/payables?project_id=X` / `/admin/finance/receivables?project_id=X`로 이동하며 해당 프로젝트 필터 적용된 목록

---

## 8. 인원별 집계

### 8.1 섹션 구조
- **액션**: `/admin/finance/by-person`
- **기대**: 3개 섹션 — `외부 파트너` / `내부 직원` / (데이터 있을 때) `기타`. 각 섹션 우측 상단에 인원수

### 8.2 컬럼 값 검증
- 파트너 A 기준:
  - planned(예정일 미래) 500,000원, paid 200,000원(이번 달) 생성 후
  - 행: 예정 `500,000원` / 완료 `200,000원` / 이번달 `200,000원` / 연체 `-`

### 8.3 연체 표기
- 파트너 B에 planned 500,000 (예정일 = 어제) 추가
- 행 연체 컬럼: `1건 · 500,000원` (빨강)

### 8.4 내부 직원 표기
- 내부 직원(payee_app_user_id 세팅)으로 지급 1건 생성 → `내부 직원` 섹션에 등장, 보라색 배지

---

## 9. `/me/earnings` 개인 뷰

### 9.1 본인 건만 노출
- **준비**: 
  - 유저 U (role=artist 등) 로그인 상태
  - U에게 연결된 건 2개 (payee_app_user_id=U 1건, partner_id = U의 partner_id 1건)
  - 다른 유저 V의 건 1개 (연결 없음)
- **기대**: U의 페이지에 2건만 노출, V 건 없음

### 9.2 요약 카드
- 올해 실수령 합계: paid 건의 actual_amount 합 (올해 paid_at 기준)
- 지급 예정: planned 건의 amount 합 + 건수
- 최근 지급일: 가장 최근 paid_at

### 9.3 필터 탭
- `전체` / `지급 예정` / `지급 완료` / `취소` 각 탭 클릭 시 해당 status만 표시

### 9.4 행 확장
- 행 클릭 → 아래에 패널 — 지급 방식, 완료일, 파트너(있을 때), 메모(있을 때)
- 다시 클릭 → 닫힘

### 9.5 partner_id 없는 유저
- **준비**: partner_id=NULL, payee_app_user_id에도 본인 없음인 유저
- **기대**: 빈 상태 + **"파트너 정보가 연결되지 않았다면..."** 안내 박스 표시

### 9.6 API URL 조작 테스트 (보안)
- **액션**: 브라우저 devtools 네트워크 탭에서 다른 유저 ID로 `/api/me/earnings?payee_app_user_id=<OTHER_UUID>` 요청 재전송
- **기대**: 응답이 **여전히 본인 건만** 반환 (쿼리 파라미터는 kind/status/from/to만 적용됨, user 스코프는 서버가 고정)

### 9.7 로그아웃
- 헤더 `로그아웃` → 세션 종료, `/admin/login` 이동

---

## 10. 가입 신청 흐름

### 10.1 공개 가입 페이지
- 비로그인으로 `/admin/signup` 접속 → 폼 렌더링
- 이름/이메일/비밀번호/메모 입력, BU 선택 UI 없음(자동 REACT)
- 제출 → 성공 화면

### 10.2 대기 중 로그인 거부
- 생성한 계정으로 즉시 `/admin/login` 로그인 시도
- 기대: `가입 신청이 아직 승인되지 않았습니다.`

### 10.3 HEAD 승인
- HEAD 계정으로 `/admin/signup-requests` 접속
- 대기 중 탭에 신규 신청 표시 (이름/이메일/신청일/메모)
- Role 드롭다운(기본 member) → `승인` 클릭
- 대기 리스트에서 제거, 목록 새로고침
- 대응되는 app_users 행 status=active, bu_code=REACT 확인 (DB 조회)

### 10.4 반려
- 다른 대기 건에 `반려` → 확인 → `반려됨` 섹션으로 이동

---

## 11. 접근 권한 매트릭스 (총정리)

각 URL을 각 역할로 직접 방문하여 결과 확인:

| URL | HEAD admin | REACT manager | artist (active) | 비로그인 |
|---|---|---|---|---|
| `/admin` | ✅ | ✅ | → `/me/earnings` | → `/admin/login` |
| `/admin/finance` | ✅ | → `/admin` | → `/me/earnings` | → `/admin/login` |
| `/admin/finance/receivables` | ✅ | → `/admin` | → `/me/earnings` | → `/admin/login` |
| `/admin/finance/payables` | ✅ | → `/admin` | → `/me/earnings` | → `/admin/login` |
| `/admin/finance/by-project` | ✅ | → `/admin` | → `/me/earnings` | → `/admin/login` |
| `/admin/finance/by-person` | ✅ | → `/admin` | → `/me/earnings` | → `/admin/login` |
| `/admin/signup-requests` | ✅ | → `/admin` | → `/me/earnings` | → `/admin/login` |
| `/me/earnings` | ✅ | ✅ | ✅ | → `/admin/login` |
| `/admin/signup` (공개) | ✅ | ✅ | ✅ | ✅ |

---

## 12. 리포트 양식

각 시나리오 실행 후 다음 형식으로 요약:

```
[PASS/FAIL] 섹션.번호 — 제목
환경: 계정 / 브라우저 / URL
조건: (있을 시) 사전 설정값
관찰: 실제 화면/값
기대: 문서의 기대 결과
차이: (FAIL일 때만) 구체 불일치
첨부: 스크린샷, console 로그, network 응답 (실패 시)
```

실패 건은 파일 경로 최대한 특정:
- 컴포넌트: `app/admin/finance/page.tsx:123`
- API: `app/api/admin/receivables/route.ts`
- DB: `financial_entries` 테이블 특정 row id

---

## 13. 알려진 보류 항목 (테스트 제외)

다음은 현재 단계에서 구현되지 않았으므로 테스트 대상 아님:
- 계약서 → 매출 자동 복제 버튼 (추후 프로젝트 생성 흐름과 함께 재설계)
- 수금 건의 contract 연결 UI (폼에 contract_id 필드 없음)
- 원천세 예수금 카드 (디자인 참조에는 있으나 미구현)
- 프로젝트 수익성 상세 드릴다운 (현재는 by-project 집계 수준)
- 캘린더/타임라인 뷰 (AdminCalendarView/AdminTimelineView 디자인 참조 존재)
