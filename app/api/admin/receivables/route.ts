import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canManagePayments, ADMIN_BU } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const projectId = url.searchParams.get('project_id');
  const contractId = url.searchParams.get('contract_id');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from('financial_entries')
    .select(
      `id, project_id, contract_id, bu_code, kind, category, name, amount, actual_amount,
       occurred_at, due_date, paid_at, status, payment_method,
       client_name, share_rate, approved_by, approved_at, payment_ref, memo, created_at,
       projects(name, bu_code),
       contracts(title, client_name, client_company)`
    )
    .eq('kind', 'revenue')
    .eq('bu_code', ADMIN_BU)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);
  if (projectId) q = q.eq('project_id', Number(projectId));
  if (contractId) q = q.eq('contract_id', Number(contractId));
  if (from) q = q.gte('due_date', from);
  if (to) q = q.lte('due_date', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ receivables: data });
}

export async function POST(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;
  if (!canManagePayments(user)) {
    return NextResponse.json({ error: '수금 등록 권한이 없습니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      project_id,
      contract_id,
      client_name,
      category,
      name,
      amount,
      due_date,
      payment_method,
      memo,
    } = body;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('financial_entries')
      .insert({
        project_id: project_id ?? null,
        contract_id: contract_id ?? null,
        bu_code: ADMIN_BU,
        kind: 'revenue',
        status: 'planned',
        category: category ?? 'misc_revenue',
        name: name ?? null,
        client_name: client_name ?? null,
        amount: amount ?? 0,
        due_date: due_date ?? null,
        occurred_at: due_date ?? new Date().toISOString().slice(0, 10),
        payment_method: payment_method ?? null,
        memo: memo ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ receivable: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? '서버 오류' }, { status: 500 });
  }
}
