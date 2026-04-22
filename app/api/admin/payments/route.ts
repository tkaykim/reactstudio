import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canViewAll, canManagePayments } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const projectId = url.searchParams.get('project_id');
  const payeeType = url.searchParams.get('payee_type'); // 'partner' | 'staff' | 'other'
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from('financial_entries')
    .select(
      `id, project_id, bu_code, kind, category, name, amount, actual_amount,
       occurred_at, due_date, paid_at, status, payment_method,
       partner_id, payee_app_user_id, share_rate, approved_by, approved_at,
       payment_ref, memo, created_at,
       projects(name, bu_code),
       partners(display_name, name_ko),
       payee:app_users!financial_entries_payee_app_user_id_fkey(name, email)`
    )
    .eq('kind', 'expense')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
  if (status) q = q.eq('status', status);
  if (projectId) q = q.eq('project_id', Number(projectId));
  if (from) q = q.gte('due_date', from);
  if (to) q = q.lte('due_date', to);
  if (payeeType === 'partner') q = q.not('partner_id', 'is', null);
  if (payeeType === 'staff') q = q.not('payee_app_user_id', 'is', null);
  if (payeeType === 'other')
    q = q.is('partner_id', null).is('payee_app_user_id', null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data });
}

export async function POST(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;
  if (!canManagePayments(user)) {
    return NextResponse.json({ error: '지급 등록 권한이 없습니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      project_id,
      bu_code,
      category,
      name,
      amount,
      due_date,
      payment_method,
      partner_id,
      payee_app_user_id,
      share_rate,
      memo,
    } = body;

    const targetBu = bu_code ?? user.bu_code;
    if (!canViewAll(user) && targetBu !== user.bu_code) {
      return NextResponse.json({ error: '해당 BU로 등록할 권한이 없습니다.' }, { status: 403 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('financial_entries')
      .insert({
        project_id: project_id ?? null,
        bu_code: targetBu,
        kind: 'expense',
        status: 'planned',
        category: category ?? null,
        name: name ?? null,
        amount: amount ?? null,
        due_date: due_date ?? null,
        occurred_at: due_date ?? null,
        payment_method: payment_method ?? null,
        partner_id: partner_id ?? null,
        payee_app_user_id: payee_app_user_id ?? null,
        share_rate: share_rate ?? null,
        memo: memo ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payment: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? '서버 오류' }, { status: 500 });
  }
}
