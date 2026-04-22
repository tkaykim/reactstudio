import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canManageSignups } from '@/lib/admin-auth';

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!canManageSignups(guard.user)) {
    return NextResponse.json({ error: 'HEAD 소속만 접근할 수 있습니다.' }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('app_users')
    .update({
      status: 'rejected',
      approved_by: guard.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '신청을 찾을 수 없거나 이미 처리되었습니다.' }, { status: 404 });

  return NextResponse.json({ user: data });
}
