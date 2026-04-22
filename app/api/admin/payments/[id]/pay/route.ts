import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canApprovePayments, ADMIN_BU } from '@/lib/admin-auth';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;
  if (!canApprovePayments(user)) {
    return NextResponse.json({ error: '지급 완료 처리 권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const { actual_amount, payment_ref } = body as { actual_amount?: number; payment_ref?: string };

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const q = supabase
    .from('financial_entries')
    .update({
      status: 'paid',
      paid_at: now,
      actual_amount: actual_amount ?? null,
      payment_ref: payment_ref ?? null,
      approved_by: user.id,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', Number(id))
    .eq('bu_code', ADMIN_BU);
  const { data, error } = await q.select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payment: data });
}
