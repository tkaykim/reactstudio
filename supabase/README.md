# reactstudio · supabase

`reactstudio`와 `totalmanagements`(ERP)는 **하나의 Supabase 프로젝트**를 공유합니다. 이 폴더는 reactstudio가 소유한 영역의 변경 이력과 컨텍스트 스냅샷을 보관합니다.

## 파일 구조

- `schema_.sql` — reactstudio가 소유한 테이블(`inquiries`, `quotes`, `contracts`, `agreements`)과 공유 테이블 `financial_entries`의 reactstudio 확장 컬럼/인덱스를 DDL 형태로 박제한 **컨텍스트 전용** 스냅샷. `WARNING: not meant to be run` 헤더가 붙어 있습니다.
- `migrations/` — reactstudio가 적용하는 새 마이그레이션을 시간순으로 누적합니다. ERP 마이그레이션은 `totalmanagements/supabase/migrations/`에 그대로 둡니다.

## 책임 분담

| 영역 | 담당 레포 | 비고 |
|------|-----------|------|
| `inquiries`, `quotes`, `contracts`, `agreements` | reactstudio | ERP는 읽지 않음 |
| `financial_entries` 의 reactstudio 확장 컬럼 (`contract_id`, `client_name`, `due_date`, `paid_at`, `payee_app_user_id`, `approved_by`, `approved_at`, `payment_ref`) | reactstudio | ERP API는 select/insert하지 않음 → 영향 0 |
| `projects`, `partners`, `app_users`, `business_units`, `financial_entries` 코어 컬럼 등 | totalmanagements (ERP) | reactstudio는 **읽기 위주**, 쓰기는 BU=REACT 한정 |

## 작성 원칙

- 모든 reactstudio 마이그레이션은 **비파괴적**: `ADD COLUMN`(default/nullable), 제약 완화, FK 추가는 nullable로만.
- ERP 핵심 테이블의 NOT NULL 추가, 컬럼 RENAME/DROP, 타입 변경은 금지.
- ERP가 의존하는 트리거/뷰(`activity_logs`, `notifications`, `partner_settlements`)는 변경 금지.

## 진실의 원천

실 DB가 항상 진실의 원천입니다. `schema_.sql`이 어긋나면 Supabase MCP로 다시 덤프해 정정합니다.

---

## 컨벤션 (Phase 4·5 합의)

### 1. `bu_code` 가드 (Phase 5 — 라이프사이클 분리)

reactstudio가 `financial_entries`에 **쓰기**(INSERT/UPDATE/DELETE)할 때는 항상 다음 두 조건을 동시에 만족해야 합니다:

1. `apiRequireAdmin()` + 적절한 권한 체크(`canManagePayments` / `canApprovePayments`).
2. `.eq('bu_code', ADMIN_BU)` (= `'REACT'`) **그리고** `.eq('kind', 'revenue' | 'expense')`.

→ 다른 BU의 행을 reactstudio가 건드릴 수 없도록 컨벤션·코드 양쪽에서 차단.

| API | bu 가드 | kind 가드 | 권한 |
|-----|---------|-----------|------|
| `/api/admin/receivables` GET/POST | ✅ | ✅ (`revenue`) | ✅ |
| `/api/admin/receivables/[id]` GET/PATCH/DELETE | ✅ | ✅ (`revenue`) | ✅ |
| `/api/admin/receivables/[id]/collect` POST | ✅ | ✅ (`revenue`) | ✅ (approve) |
| `/api/admin/payments` GET/POST | ✅ | ✅ (`expense`) | ✅ |
| `/api/admin/payments/[id]` GET/PATCH/DELETE | ✅ | ✅ (`expense`) | ✅ |
| `/api/admin/payments/[id]/pay` POST | ✅ | ✅ (`expense`) | ✅ (approve) |

새 재무 API를 추가할 때도 위 표의 가드를 모두 따릅니다.

`partners` 테이블은 reactstudio에서 **읽기만** 합니다 (`is_active=true`로 검색). 쓰기 경로 신설 금지.

### 2. 프로젝트명 단일 진실원 (Phase 4 — DB 변경 없음)

같은 거래에 대해 `inquiries.project_title`, `contracts.title`, `projects.name`이 분리 저장될 수 있습니다. DB 트리거나 NOT NULL 제약을 추가하면 ERP의 `projects` 라이프사이클·`activity_logs` 흐름과 충돌하므로, **표시 정책으로만** 단일화합니다:

- **표시 우선순위**: `projects.name` ▸ `contracts.title` ▸ `inquiries.project_title`
- `inquiry.project_id IS NOT NULL`이면 `projects.name`을 **메인**으로, `inquiries.project_title`은 *접수 당시 별칭*으로 보조 표기.
- 두 값이 다르면 어드민 문의 상세에서 보조 라벨로 함께 노출 (정정 트리거는 두지 않음).
- 외부(이메일/견적서/계약서)에는 항상 그 시점의 컨텍스트(`contracts.title` 또는 `projects.name`)를 박제해서 발송. 사후 수정해도 이미 발송된 문서는 변하지 않습니다.

### 3. 마이그레이션 거버넌스 (Phase 6)

- 두 레포는 같은 `supabase_migrations.schema_migrations` 테이블을 공유합니다. 한 레포에서 `supabase db reset`을 돌릴 때 반대편 마이그레이션 폴더가 동기화되어 있지 않으면 일부가 누락됩니다. 운영 DB에 직접 reset을 실행하지 않습니다.
- 새 마이그레이션은 **MCP `apply_migration`로 적용한 뒤** 동일 이름의 SQL 파일을 본 레포 `migrations/`에 커밋합니다 (이름이 같으면 중복 적용되지 않음).
- ERP의 수기 타입(`totalmanagements/src/types/database.ts`)은 유지하되, 정합성은 다음 절차로 점검합니다:
  1. Supabase MCP `list_tables(verbose=true)`로 실 DB 컬럼/제약 덤프
  2. ERP 수기 타입과 reactstudio `types/index.ts`의 차이를 검토
  3. 차이가 있으면 ERP 수기 타입 정정 또는 본 폴더의 `schema_.sql` 주석에 "Known divergences" 항목 추가
- `supabase gen types typescript --linked > database.types.ts` 자동화는 두 레포에 각각 추가할 수 있지만, **수기 타입 파일은 그대로 두고 자동 생성 타입은 보조 검증용으로만** 사용합니다 (수기 타입이 의도적으로 좁힌 약속을 깨지 않도록).

### 4. ERP에 영향 주지 않는다는 확인 절차

새 컬럼·FK·인덱스를 추가하기 전에 다음을 확인합니다:

1. ERP가 해당 테이블/컬럼을 select하는지: `rg "from\(['\"]TABLE['\"]\)|TABLE\(" totalmanagements/src`
2. ERP가 해당 컬럼을 insert/update body에 포함하는지: 같은 파일에서 INSERT/UPSERT/UPDATE 사용처 점검
3. ERP의 트리거/뷰가 의존하는지: `totalmanagements/schema_.sql` + Supabase MCP `pg_trigger`/`pg_views` 점검

`inquiries`처럼 ERP가 일절 참조하지 않는 테이블은 (1)에서 0건 확인만으로 안전.
