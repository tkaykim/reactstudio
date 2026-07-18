import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import type { ReviewAuthorRole } from '@/lib/review-rooms';

const allowedRoles: ReviewAuthorRole[] = [
  'internal',
  'client',
  'channel_owner',
  'editor',
  'director',
  'viewer',
];

function cleanText(value: unknown, max = 1000) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string; annotationId: string }> }
) {
  const { token, annotationId: annotationIdParam } = await context.params;
  const annotationId = Number(annotationIdParam);
  if (!Number.isFinite(annotationId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const authorName = cleanText(body.author_name, 80);
  const text = cleanText(body.body, 3000);
  if (!authorName) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  if (!text) return NextResponse.json({ error: '답글을 입력해주세요.' }, { status: 400 });

  const role = allowedRoles.includes(body.author_role as ReviewAuthorRole)
    ? (body.author_role as ReviewAuthorRole)
    : 'client';

  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from('react_review_rooms')
    .select('id')
    .eq('share_token', token)
    .eq('bu_code', 'REACT')
    .maybeSingle();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  if (!room) return NextResponse.json({ error: '리뷰룸을 찾을 수 없습니다.' }, { status: 404 });

  const { data: annotation, error: annotationError } = await supabase
    .from('react_review_annotations')
    .select('id,room_id,video_id')
    .eq('id', annotationId)
    .eq('room_id', room.id)
    .maybeSingle();

  if (annotationError) return NextResponse.json({ error: annotationError.message }, { status: 500 });
  if (!annotation) return NextResponse.json({ error: '코멘트를 찾을 수 없습니다.' }, { status: 404 });

  const { data, error } = await supabase
    .from('react_review_replies')
    .insert({
      annotation_id: annotationId,
      body: text,
      author_name: authorName,
      author_email: cleanText(body.author_email, 200),
      author_role: role,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: annotation.room_id,
    video_id: annotation.video_id,
    annotation_id: annotation.id,
    event_type: 'reply_created',
    actor_name: authorName,
    actor_role: role,
    payload: {},
  });

  return NextResponse.json({ reply: data });
}
