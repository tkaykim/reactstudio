# REACT Staff Pool Spec Delta

## 변경 요청

REACT Studio에서 제작사, 팀, 개인 스탭풀 지원을 받고 관리자 화면에서 검색, 정렬, 검토, 파트너 전환까지 할 수 있게 만든다.

## 추가 기능

- 공개 지원 페이지 `/staff/apply`.
- 관리자 스탭풀 페이지 `/admin/staff-pool`.
- 지원자 기본 정보, 회사 정보, 개인 정보, 대분류 역량, 세부 스킬, 경력, 대표작, 단가 카드, 툴, 장비, 첨부파일 수집.
- 보유 장비 현황은 검색용 태그와 별도로 줄글 원문을 보존한다.
- 촬영, 짐벌, 지미집, 편집, 자막, OAP, 실시간 송출, 생성형 AI처럼 세부 분야가 많은 현실을 별도 스킬 엔트리와 단가 카드로 기록.
- private Supabase Storage bucket `react-staff-files`.
- REACT 로고 자산 기반 헤더, 푸터, 관리자, OG 메타 표면 정리.

## 영향 범위

- `app/(main)/staff/apply`
- `components/sections/staff/StaffApplyForm.tsx`
- `app/admin/staff-pool`
- `app/api/staff/apply`
- `app/api/admin/staff-pool`
- `lib/staff-pool.ts`
- `supabase/migrations/20260706_react_staff_pool.sql`

## 완료 조건

- `npm run build` 통과.
- 스탭풀 신규 파일 lint 통과.
- 공개 지원 화면과 관리자 목록 화면을 브라우저로 확인.
- 신규 Supabase 테이블은 RLS enabled 상태로 생성.
