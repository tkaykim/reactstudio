import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const { inquiry_id, items, supply_amount, vat, total_amount, valid_until, notes } = body;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        bu_code: ADMIN_BU, inquiry_id, items, supply_amount, vat, total_amount, valid_until, notes,
        status: 'draft',
        view_token: randomUUID(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quote: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const { id, cc_emails: _cc, bu_code: _ignored, ...updates } = body;
    void _cc;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .eq('bu_code', ADMIN_BU)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quote: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
