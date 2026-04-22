import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canViewAll } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  try {
    const body = await req.json();
    const { inquiry_id, items, supply_amount, vat, total_amount, valid_until, notes } = body;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        bu_code: user.bu_code, inquiry_id, items, supply_amount, vat, total_amount, valid_until, notes,
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
  const { user } = guard;

  try {
    const body = await req.json();
    const { id, cc_emails, bu_code: _ignored, ...updates } = body;

    const supabase = createSupabaseAdminClient();
    let q = supabase.from('quotes').update(updates).eq('id', id);
    if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
    const { data, error } = await q.select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quote: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
