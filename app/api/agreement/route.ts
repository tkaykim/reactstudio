import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';

export async function GET() {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('bu_code', ADMIN_BU)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agreements: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const { bu_code: _ignored, ...body } = await req.json();
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('agreements')
      .insert({ ...body, bu_code: ADMIN_BU })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agreement: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const { id, bu_code: _ignored, ...updates } = body;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('agreements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('bu_code', ADMIN_BU)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agreement: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
