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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string; thumbnailId: string }> }
) {
  const { token, thumbnailId: thumbnailIdParam } = await context.params;
  const thumbnailId = Number(thumbnailIdParam);
  if (!Number.isFinite(thumbnailId)) {
    return NextResponse.json({ error: '잘못된 썸네일입니다.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const actorName = typeof body.author_name === 'string' ? body.author_name.trim().slice(0, 80) : '';
  if (!actorName) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  const role = allowedRoles.includes(body.author_role as ReviewAuthorRole)
    ? (body.author_role as ReviewAuthorRole)
    : 'client';

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

  const { data: thumb, error: thumbError } = await supabase
    .from('react_review_thumbnails')
    .select('id,label')
    .eq('id', thumbnailId)
    .eq('room_id', room.id)
    .maybeSingle();
  if (thumbError) return NextResponse.json({ error: thumbError.message }, { status: 500 });
  if (!thumb) return NextResponse.json({ error: '썸네일을 찾을 수 없습니다.' }, { status: 404 });

  const { error: clearError } = await supabase
    .from('react_review_thumbnails')
    .update({ status: 'proposed', selected_at: null, selected_by: null, updated_at: new Date().toISOString() })
    .eq('room_id', room.id)
    .eq('status', 'selected');
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });

  const { data, error } = await supabase
    .from('react_review_thumbnails')
    .update({
      status: 'selected',
      selected_at: new Date().toISOString(),
      selected_by: actorName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', thumbnailId)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: room.id,
    event_type: 'thumbnail_selected',
    actor_name: actorName,
    actor_role: role,
    payload: { thumbnail_id: thumbnailId, label: thumb.label },
  });

  return NextResponse.json({ thumbnail: data });
}
