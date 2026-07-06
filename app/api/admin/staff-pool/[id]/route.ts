import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { STAFF_STATUS_OPTIONS } from '@/lib/staff-pool';

const allowedStatuses = STAFF_STATUS_OPTIONS.map((item) => item.value);

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const patch: Record<string, unknown> = {};

  if ('status' in body) {
    if (
      typeof body.status !== 'string' ||
      !allowedStatuses.includes(body.status as (typeof allowedStatuses)[number])
    ) {
      return NextResponse.json({ error: '상태값이 올바르지 않습니다.' }, { status: 400 });
    }
    patch.status = body.status;
    patch.reviewed_by = user.id;
    patch.reviewed_at = new Date().toISOString();
  }

  if ('admin_rating' in body) {
    const rating = body.admin_rating === null || body.admin_rating === ''
      ? null
      : Number(body.admin_rating);
    if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: '평점은 1에서 5 사이여야 합니다.' }, { status: 400 });
    }
    patch.admin_rating = rating;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('react_staff_applications')
    .update(patch)
    .eq('id', id)
    .eq('bu_code', ADMIN_BU)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}
