import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canManagePayments, ADMIN_BU } from '@/lib/admin-auth';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { id } = await context.params;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('financial_entries')
    .select(
      `*,
       projects(name, bu_code),
       partners(display_name, name_ko),
       payee:app_users!financial_entries_payee_app_user_id_fkey(name, email)`
    )
    .eq('id', Number(id))
    .eq('bu_code', ADMIN_BU)
    .single();

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
  delete body.bu_code;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('financial_entries')
    .update({ ...body, bu_code: ADMIN_BU, updated_at: new Date().toISOString() })
    .eq('id', Number(id))
    .eq('bu_code', ADMIN_BU)
    .select()
    .single();

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
  const { error } = await supabase
    .from('financial_entries')
    .delete()
    .eq('id', Number(id))
    .eq('bu_code', ADMIN_BU);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
