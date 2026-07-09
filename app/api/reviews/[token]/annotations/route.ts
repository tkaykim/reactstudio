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

const allowedShapes: ReviewAnnotationShape[] = ['time', 'pin', 'box'];

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

  const { data: video, error: videoError } = await supabase
    .from('react_review_videos')
    .select('id')
    .eq('room_id', room.id)
    .eq('is_current', true)
    .maybeSingle();

  if (videoError) return NextResponse.json({ error: videoError.message }, { status: 500 });
  if (!video) return NextResponse.json({ error: '연결된 영상이 없습니다.' }, { status: 404 });

  const { data, error } = await supabase
    .from('react_review_annotations')
    .insert({
      room_id: room.id,
      video_id: video.id,
      body: text,
      time_sec: Math.max(0, cleanNumber(body.time_sec)),
      x_pct: shape === 'time' ? null : pct(body.x_pct),
      y_pct: shape === 'time' ? null : pct(body.y_pct),
      w_pct: shape === 'box' ? pct(body.w_pct) : null,
      h_pct: shape === 'box' ? pct(body.h_pct) : null,
      shape,
      author_name: authorName,
      author_email: cleanText(body.author_email, 200),
      author_role: role,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: room.id,
    video_id: video.id,
    annotation_id: data.id,
    event_type: 'annotation_created',
    actor_name: authorName,
    actor_role: role,
    payload: { shape, time_sec: data.time_sec },
  });

  return NextResponse.json({ annotation: { ...data, replies: [] } });
}
