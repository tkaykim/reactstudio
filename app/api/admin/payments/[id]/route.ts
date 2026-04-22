import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canViewAll, canManagePayments } from '@/lib/admin-auth';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;
  const { id } = await context.params;

  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from('financial_entries')
    .select(
      `*,
       projects(name, bu_code),
       partners(display_name, name_ko),
       payee:app_users!financial_entries_payee_app_user_id_fkey(name, email)`
    )
    .eq('id', Number(id));
  if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
  const { data, error } = await q.single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payment: data });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;
  if (!canManagePayments(user)) {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await req.json();

  const { bu_code: targetBu, ...updates } = body;
  if (targetBu && !canViewAll(user) && targetBu !== user.bu_code) {
    return NextResponse.json({ error: '해당 BU로 변경할 권한이 없습니다.' }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from('financial_entries')
    .update({ ...updates, ...(targetBu ? { bu_code: targetBu } : {}), updated_at: new Date().toISOString() })
    .eq('id', Number(id));
  if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
  const { data, error } = await q.select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payment: data });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;
  if (!canManagePayments(user)) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();
  let q = supabase.from('financial_entries').delete().eq('id', Number(id));
  if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
