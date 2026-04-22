import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireMe } from '@/lib/me-auth';

export async function GET(req: NextRequest) {
  const guard = await apiRequireMe();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const supabase = createSupabaseAdminClient();
  let q = supabase
    .from('financial_entries')
    .select(
      `id, kind, category, name, amount, actual_amount, occurred_at, due_date, paid_at,
       status, payment_method, partner_id, payee_app_user_id, share_rate, memo, project_id,
       projects(name),
       partners(display_name, name_ko)`
    )
    .eq('kind', 'expense')
    .order('occurred_at', { ascending: false, nullsFirst: false });

  // Match: payee_app_user_id = me OR partner_id = my_partner_id
  if (user.partner_id) {
    q = q.or(`payee_app_user_id.eq.${user.id},partner_id.eq.${user.partner_id}`);
  } else {
    q = q.eq('payee_app_user_id', user.id);
  }

  if (status) q = q.eq('status', status);
  if (from) q = q.gte('due_date', from);
  if (to) q = q.lte('due_date', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}
