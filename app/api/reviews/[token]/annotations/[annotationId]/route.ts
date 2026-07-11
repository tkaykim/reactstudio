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

// 공유 페이지에서 코멘트 완료 체크(열림↔수정완료)만 토글할 수 있다.
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ token: string; annotationId: string }> }
) {
  const { token, annotationId: annotationIdParam } = await context.params;
  const annotationId = Number(annotationIdParam);
  if (!Number.isFinite(annotationId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const actorName = typeof body.author_name === 'string' ? body.author_name.trim().slice(0, 80) : '';
  if (!actorName) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  const role = allowedRoles.includes(body.author_role as ReviewAuthorRole)
    ? (body.author_role as ReviewAuthorRole)
    : 'client';

  const status = body.status;
  if (status !== 'open' && status !== 'resolved') {
    return NextResponse.json({ error: '상태값이 올바르지 않습니다.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from('react_review_rooms')
    .select('id')
    .eq('share_token', token)
    .eq('bu_code', 'REACT')
    .neq('status', 'archived')
    .maybeSingle();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  if (!room) return NextResponse.json({ error: '리뷰룸을 찾을 수 없습니다.' }, { status: 404 });

  const { data, error } = await supabase
    .from('react_review_annotations')
    .update({
      status,
      resolved_by: null,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', annotationId)
    .eq('room_id', room.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: room.id,
    video_id: data.video_id,
    annotation_id: data.id,
    event_type: 'annotation_status_toggled',
    actor_name: actorName,
    actor_role: role,
    payload: { status },
  });

  return NextResponse.json({ annotation: data });
}
