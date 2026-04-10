import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { CURRENT_BU_CODE } from '@/types';

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('bu_code', CURRENT_BU_CODE)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agreements: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('agreements')
      .insert({ ...body, bu_code: CURRENT_BU_CODE })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agreement: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('agreements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('bu_code', CURRENT_BU_CODE)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agreement: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
