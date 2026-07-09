# React Review Rooms

## 변경 요청

ReactStudio 앱 안에 내부 담당자, 클라이언트, 채널주, 외주 편집자, 감독이 같은 영상 위에서 타임코드와 화면 좌표 기반 피드백을 주고받는 리뷰룸을 추가한다.

## 추가 기능

- 관리자 `/admin/reviews`에서 리뷰룸을 만들고 YouTube 미공개 영상과 연결한다.
- 파일 업로드는 ReactStudio 서버를 대용량 프록시로 쓰지 않고, 브라우저가 YouTube resumable upload URL로 직접 전송한다.
- YouTube OAuth refresh token, client id, client secret은 env에만 둔다.
- 외부 공유 링크 `/review/[token]`에서 로그인 없이 코멘트와 답글을 남긴다.
- 영상 현재 시점, 화면 좌표 핀, 영역 박스 좌표를 DB에 저장한다.
- 관리자 화면에서 코멘트 상태를 open, in_progress, resolved, approved로 관리한다.

## 영향 받는 파일

- `supabase/migrations/*react_review_rooms.sql`
- `lib/youtube.ts`
- `lib/review-rooms.ts`
- `app/admin/reviews/**`
- `app/review/[token]/**`
- `app/api/admin/reviews/**`
- `app/api/reviews/**`
- `app/admin/AdminSidebar.tsx`

## 회귀 위험

- 관리자 레이아웃과 사이드바 링크 추가.
- YouTube helper 확장.
- Supabase service-role API route 추가.

## 완료 조건

- `npm run lint` 통과.
- `npm run build` 통과.
- 관리자 리뷰룸 목록과 외부 리뷰 링크가 렌더링된다.
- YouTube env가 없을 때도 수동 YouTube URL 연결 기능은 정상 작동한다.
- 대용량 파일은 앱 서버로 전송하지 않는 업로드 세션 구조를 가진다.
