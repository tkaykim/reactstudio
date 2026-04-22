import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canViewAll } from '@/lib/admin-auth';

export async function GET() {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  try {
    const supabase = createSupabaseAdminClient();
    let q = supabase.from('agreements').select('*').order('created_at', { ascending: false });
    if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
    const { data, error } = await q;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agreements: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  try {
    const { bu_code: _ignored, ...body } = await req.json();
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('agreements')
      .insert({ ...body, bu_code: user.bu_code })
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
  const { user } = guard;

  try {
    const body = await req.json();
    const { id, bu_code: _ignored, ...updates } = body;
    const supabase = createSupabaseAdminClient();
    let q = supabase
      .from('agreements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
    const { data, error } = await q.select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ agreement: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
