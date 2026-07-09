import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import type { ReviewRoomStatus } from '@/lib/review-rooms';

const allowedStatuses: ReviewRoomStatus[] = [
  'draft',
  'uploading',
  'processing',
  'open',
  'in_review',
  'approved',
  'archived',
];

function cleanText(value: unknown, max = 1000) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};

  if ('status' in body) {
    if (typeof body.status !== 'string' || !allowedStatuses.includes(body.status as ReviewRoomStatus)) {
      return NextResponse.json({ error: '상태값이 올바르지 않습니다.' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if ('title' in body) patch.title = cleanText(body.title, 160);
  if ('client_name' in body) patch.client_name = cleanText(body.client_name, 120);
  if ('description' in body) patch.description = cleanText(body.description, 2000);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('react_review_rooms')
    .update(patch)
    .eq('id', id)
    .eq('bu_code', ADMIN_BU)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: id,
    event_type: 'room_updated',
    actor_name: user.name,
    actor_role: 'internal',
    payload: patch,
  });

  return NextResponse.json({ room: data });
}
