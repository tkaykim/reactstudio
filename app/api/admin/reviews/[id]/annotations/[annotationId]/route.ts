import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import type { ReviewAnnotationStatus } from '@/lib/review-rooms';

const allowedStatuses: ReviewAnnotationStatus[] = ['open', 'in_progress', 'resolved', 'approved'];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; annotationId: string }> }
) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { id: roomIdParam, annotationId: annotationIdParam } = await context.params;
  const roomId = Number(roomIdParam);
  const annotationId = Number(annotationIdParam);
  if (!Number.isFinite(roomId) || !Number.isFinite(annotationId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};

  if ('status' in body) {
    if (typeof body.status !== 'string' || !allowedStatuses.includes(body.status as ReviewAnnotationStatus)) {
      return NextResponse.json({ error: '상태값이 올바르지 않습니다.' }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === 'resolved' || body.status === 'approved') {
      patch.resolved_by = user.id;
      patch.resolved_at = new Date().toISOString();
    } else {
      patch.resolved_by = null;
      patch.resolved_at = null;
    }
  }

  if ('priority' in body) {
    if (body.priority !== 'normal' && body.priority !== 'high') {
      return NextResponse.json({ error: '우선순위가 올바르지 않습니다.' }, { status: 400 });
    }
    patch.priority = body.priority;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('react_review_annotations')
    .update(patch)
    .eq('id', annotationId)
    .eq('room_id', roomId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: roomId,
    video_id: data.video_id,
    annotation_id: data.id,
    event_type: 'annotation_updated',
    actor_name: user.name,
    actor_role: 'internal',
    payload: patch,
  });

  return NextResponse.json({ annotation: data });
}
