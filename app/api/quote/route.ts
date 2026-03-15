import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { CURRENT_BU_CODE } from '@/types';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inquiry_id, items, supply_amount, vat, total_amount, valid_until, notes } = body;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        bu_code: CURRENT_BU_CODE, inquiry_id, items, supply_amount, vat, total_amount, valid_until, notes,
        status: 'draft',
        view_token: randomUUID(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quote: data });
  } catch (e) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quote: data });
  } catch (e) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
