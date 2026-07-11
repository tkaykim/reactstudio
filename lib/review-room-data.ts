import { createSupabaseAdminClient } from '@/lib/supabase';
import type {
  ReviewAnnotationRow,
  ReviewReplyRow,
  ReviewRoomRow,
  ReviewThumbnailRow,
  ReviewVideoRow,
} from '@/lib/review-rooms';

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeVideo(row: Record<string, unknown>): ReviewVideoRow {
  return {
    ...(row as unknown as ReviewVideoRow),
    id: asNumber(row.id),
    room_id: asNumber(row.room_id),
    size_bytes: nullableNumber(row.size_bytes),
  };
}

function normalizeReply(row: Record<string, unknown>): ReviewReplyRow {
  return {
    ...(row as unknown as ReviewReplyRow),
    id: asNumber(row.id),
    annotation_id: asNumber(row.annotation_id),
  };
}

function normalizeAnnotation(row: Record<string, unknown>, replies: ReviewReplyRow[]): ReviewAnnotationRow {
  return {
    ...(row as unknown as ReviewAnnotationRow),
    id: asNumber(row.id),
    room_id: asNumber(row.room_id),
    video_id: nullableNumber(row.video_id),
    thumbnail_id: nullableNumber(row.thumbnail_id),
    time_sec: asNumber(row.time_sec),
    end_time_sec: nullableNumber(row.end_time_sec),
    x_pct: nullableNumber(row.x_pct),
    y_pct: nullableNumber(row.y_pct),
    w_pct: nullableNumber(row.w_pct),
    h_pct: nullableNumber(row.h_pct),
    replies,
  };
}

function normalizeThumbnail(row: Record<string, unknown>): ReviewThumbnailRow {
  return {
    ...(row as unknown as ReviewThumbnailRow),
    id: asNumber(row.id),
    room_id: asNumber(row.room_id),
    size_bytes: nullableNumber(row.size_bytes),
  };
}

export async function loadReviewRoomById(id: number) {
  const supabase = createSupabaseAdminClient();
  const { data: room, error } = await supabase
    .from('react_review_rooms')
    .select('*')
    .eq('id', id)
    .eq('bu_code', 'REACT')
    .maybeSingle();

  if (error) console.error('[review-room] room by id', error);
  if (!room) return null;
  return loadReviewRoomChildren(room as Record<string, unknown>);
}

export async function loadReviewRoomByToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data: room, error } = await supabase
    .from('react_review_rooms')
    .select('*')
    .eq('share_token', token)
    .eq('bu_code', 'REACT')
    .neq('status', 'archived')
    .maybeSingle();

  if (error) console.error('[review-room] room by token', error);
  if (!room) return null;

  await supabase
    .from('react_review_rooms')
    .update({ last_viewed_at: new Date().toISOString() })
    .eq('id', room.id);

  return loadReviewRoomChildren(room as Record<string, unknown>);
}

async function loadReviewRoomChildren(room: Record<string, unknown>): Promise<ReviewRoomRow> {
  const supabase = createSupabaseAdminClient();
  const roomId = asNumber(room.id);

  const [videosRes, annotationsRes, thumbnailsRes, projectRes] = await Promise.all([
    supabase
      .from('react_review_videos')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false }),
    supabase
      .from('react_review_annotations')
      .select('*')
      .eq('room_id', roomId)
      .order('time_sec', { ascending: true }),
    supabase
      .from('react_review_thumbnails')
      .select('*')
      .eq('room_id', roomId)
      .neq('status', 'archived')
      .order('created_at', { ascending: true }),
    room.project_id
      ? supabase.from('projects').select('id,name').eq('id', room.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (videosRes.error) console.error('[review-room] videos', videosRes.error);
  if (annotationsRes.error) console.error('[review-room] annotations', annotationsRes.error);
  if (thumbnailsRes.error) console.error('[review-room] thumbnails', thumbnailsRes.error);

  const annotationRows = (annotationsRes.data ?? []) as Array<Record<string, unknown>>;
  const annotationIds = annotationRows.map((item) => asNumber(item.id));
  const repliesRes = annotationIds.length
    ? await supabase
        .from('react_review_replies')
        .select('*')
        .in('annotation_id', annotationIds)
        .order('created_at', { ascending: true })
    : { data: [] as Array<Record<string, unknown>>, error: null };

  if (repliesRes.error) console.error('[review-room] replies', repliesRes.error);

  const repliesByAnnotation = new Map<number, ReviewReplyRow[]>();
  for (const reply of (repliesRes.data ?? []) as Array<Record<string, unknown>>) {
    const normalized = normalizeReply(reply);
    repliesByAnnotation.set(normalized.annotation_id, [
      ...(repliesByAnnotation.get(normalized.annotation_id) ?? []),
      normalized,
    ]);
  }

  return {
    ...(room as unknown as ReviewRoomRow),
    id: roomId,
    project_id: nullableNumber(room.project_id),
    project_name: (projectRes.data as { name?: string } | null)?.name ?? null,
    videos: ((videosRes.data ?? []) as Array<Record<string, unknown>>).map(normalizeVideo),
    annotations: annotationRows.map((annotation) =>
      normalizeAnnotation(annotation, repliesByAnnotation.get(asNumber(annotation.id)) ?? [])
    ),
    thumbnails: ((thumbnailsRes.data ?? []) as Array<Record<string, unknown>>).map(normalizeThumbnail),
  };
}
