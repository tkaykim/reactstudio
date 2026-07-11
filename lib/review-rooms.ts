export type ReviewRoomStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'open'
  | 'in_review'
  | 'approved'
  | 'archived';

export type ReviewUploadStatus = 'queued' | 'uploading' | 'processing' | 'ready' | 'failed';

export type ReviewAnnotationStatus = 'open' | 'in_progress' | 'resolved' | 'rejected' | 'approved';

export type ReviewAuthorRole =
  | 'internal'
  | 'client'
  | 'channel_owner'
  | 'editor'
  | 'director'
  | 'viewer';

export type ReviewAnnotationShape = 'time' | 'range' | 'pin' | 'box';

export type ReviewThumbnailStatus = 'proposed' | 'selected' | 'archived';

export interface ReviewThumbnailRow {
  id: number;
  room_id: number;
  label: string;
  image_url: string;
  storage_path: string | null;
  size_bytes: number | null;
  status: ReviewThumbnailStatus;
  author_name: string;
  author_role: ReviewAuthorRole;
  selected_at: string | null;
  selected_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewVideoRow {
  id: number;
  room_id: number;
  version_label: string;
  title: string;
  description: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  upload_status: ReviewUploadStatus;
  youtube_response: Record<string, unknown>;
  is_current: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewReplyRow {
  id: number;
  annotation_id: number;
  body: string;
  author_name: string;
  author_email: string | null;
  author_role: ReviewAuthorRole;
  created_by: string | null;
  created_at: string;
}

export interface ReviewAnnotationRow {
  id: number;
  room_id: number;
  video_id: number | null;
  thumbnail_id: number | null;
  body: string;
  time_sec: number;
  end_time_sec: number | null;
  x_pct: number | null;
  y_pct: number | null;
  w_pct: number | null;
  h_pct: number | null;
  shape: ReviewAnnotationShape;
  status: ReviewAnnotationStatus;
  priority: 'normal' | 'high';
  author_name: string;
  author_email: string | null;
  author_role: ReviewAuthorRole;
  created_by: string | null;
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  replies: ReviewReplyRow[];
}

export interface ReviewRoomRow {
  id: number;
  bu_code: 'REACT';
  project_id: number | null;
  title: string;
  client_name: string | null;
  description: string | null;
  share_token: string;
  status: ReviewRoomStatus;
  default_privacy: 'private' | 'unlisted';
  expires_at: string | null;
  last_viewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string | null;
  videos: ReviewVideoRow[];
  annotations: ReviewAnnotationRow[];
  thumbnails: ReviewThumbnailRow[];
}

export const REVIEW_ROOM_STATUS_OPTIONS: Array<{ value: ReviewRoomStatus; label: string }> = [
  { value: 'draft', label: '준비' },
  { value: 'uploading', label: '업로드중' },
  { value: 'processing', label: '처리중' },
  { value: 'open', label: '리뷰중' },
  { value: 'in_review', label: '수정중' },
  { value: 'approved', label: '승인' },
  { value: 'archived', label: '보관' },
];

export const REVIEW_ANNOTATION_STATUS_OPTIONS: Array<{
  value: ReviewAnnotationStatus;
  label: string;
  description: string;
}> = [
  { value: 'open', label: '요청됨', description: '수정 요청이 접수된 상태' },
  { value: 'in_progress', label: '처리중', description: '편집자가 작업 중' },
  { value: 'resolved', label: '처리완료', description: '수정이 반영됨' },
  { value: 'rejected', label: '반려', description: '처리하지 않기로 함 (사유는 답글로)' },
  { value: 'approved', label: '확인완료', description: '요청자가 반영을 확인함' },
];

export const REVIEW_AUTHOR_ROLE_OPTIONS: Array<{ value: ReviewAuthorRole; label: string }> = [
  { value: 'internal', label: 'REACT 담당자' },
  { value: 'client', label: '클라이언트' },
  { value: 'channel_owner', label: '채널주' },
  { value: 'editor', label: '편집자' },
  { value: 'director', label: '감독' },
  { value: 'viewer', label: '참관자' },
];

export function reviewStatusLabel(status: ReviewRoomStatus) {
  return REVIEW_ROOM_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function annotationStatusLabel(status: ReviewAnnotationStatus) {
  return REVIEW_ANNOTATION_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function authorRoleLabel(role: ReviewAuthorRole) {
  return REVIEW_AUTHOR_ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role;
}

export function formatTimecode(seconds: number | string | null | undefined) {
  const raw = typeof seconds === 'string' ? Number(seconds) : seconds ?? 0;
  const safe = Number.isFinite(raw) ? Math.max(0, Number(raw)) : 0;
  const total = Math.floor(safe);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatTimeRange(startSec: number, endSec: number | null | undefined) {
  const end = typeof endSec === 'number' && Number.isFinite(endSec) ? endSec : null;
  if (end === null || end <= startSec) return formatTimecode(startSec);
  return `${formatTimecode(startSec)}–${formatTimecode(end)}`;
}

export function roomSharePath(token: string) {
  return `/review/${encodeURIComponent(token)}`;
}
