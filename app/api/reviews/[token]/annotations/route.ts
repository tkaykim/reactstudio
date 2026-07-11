import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import type { ReviewAnnotationShape, ReviewAuthorRole } from '@/lib/review-rooms';

const allowedRoles: ReviewAuthorRole[] = [
  'internal',
  'client',
  'channel_owner',
  'editor',
  'director',
  'viewer',
];

const allowedShapes: ReviewAnnotationShape[] = ['time', 'range', 'pin', 'box'];

function cleanText(value: unknown, max = 1000) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

function cleanNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const authorName = cleanText(body.author_name, 80);
  const text = cleanText(body.body, 3000);

  if (!authorName) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  if (!text) return NextResponse.json({ error: '코멘트를 입력해주세요.' }, { status: 400 });

  const role = allowedRoles.includes(body.author_role as ReviewAuthorRole)
    ? (body.author_role as ReviewAuthorRole)
    : 'client';
  const shape = allowedShapes.includes(body.shape as ReviewAnnotationShape)
    ? (body.shape as ReviewAnnotationShape)
    : 'time';

  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from('react_review_rooms')
    .select('id,status')
    .eq('share_token', token)
    .eq('bu_code', 'REACT')
    .neq('status', 'archived')
    .maybeSingle();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  if (!room) return NextResponse.json({ error: '리뷰룸을 찾을 수 없습니다.' }, { status: 404 });

  // 타깃 결정: 썸네일 코멘트 vs 영상 코멘트
  const thumbnailIdRaw = Number(body.thumbnail_id);
  const thumbnailId = Number.isFinite(thumbnailIdRaw) && thumbnailIdRaw > 0 ? thumbnailIdRaw : null;

  let videoId: number | null = null;
  if (thumbnailId) {
    const { data: thumb, error: thumbError } = await supabase
      .from('react_review_thumbnails')
      .select('id')
      .eq('id', thumbnailId)
      .eq('room_id', room.id)
      .maybeSingle();
    if (thumbError) return NextResponse.json({ error: thumbError.message }, { status: 500 });
    if (!thumb) return NextResponse.json({ error: '썸네일을 찾을 수 없습니다.' }, { status: 404 });
  } else {
    const { data: video, error: videoError } = await supabase
      .from('react_review_videos')
      .select('id')
      .eq('room_id', room.id)
      .eq('is_current', true)
      .maybeSingle();
    if (videoError) return NextResponse.json({ error: videoError.message }, { status: 500 });
    if (!video) return NextResponse.json({ error: '연결된 영상이 없습니다.' }, { status: 404 });
    videoId = video.id;
  }

  const finalShape: ReviewAnnotationShape = thumbnailId && shape === 'range' ? 'time' : shape;
  const timeSec = thumbnailId ? 0 : Math.max(0, cleanNumber(body.time_sec));
  let endTimeSec: number | null = null;
  if (shape === 'range' && !thumbnailId) {
    const rawEnd = cleanNumber(body.end_time_sec, -1);
    if (rawEnd <= timeSec) {
      return NextResponse.json({ error: '구간 종료 지점은 시작 지점보다 뒤여야 합니다.' }, { status: 400 });
    }
    endTimeSec = rawEnd;
  }

  const { data, error } = await supabase
    .from('react_review_annotations')
    .insert({
      room_id: room.id,
      video_id: videoId,
      thumbnail_id: thumbnailId,
      body: text,
      time_sec: timeSec,
      end_time_sec: endTimeSec,
      x_pct: finalShape === 'time' || finalShape === 'range' ? null : pct(body.x_pct),
      y_pct: finalShape === 'time' || finalShape === 'range' ? null : pct(body.y_pct),
      w_pct: finalShape === 'box' ? pct(body.w_pct) : null,
      h_pct: finalShape === 'box' ? pct(body.h_pct) : null,
      shape: finalShape,
      author_name: authorName,
      author_email: cleanText(body.author_email, 200),
      author_role: role,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: room.id,
    video_id: videoId,
    annotation_id: data.id,
    event_type: 'annotation_created',
    actor_name: authorName,
    actor_role: role,
    payload: { shape: finalShape, time_sec: data.time_sec, end_time_sec: endTimeSec, thumbnail_id: thumbnailId },
  });

  return NextResponse.json({ annotation: { ...data, replies: [] } });
}
