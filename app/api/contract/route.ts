import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canViewAll } from '@/lib/admin-auth';
import { randomUUID } from 'crypto';

export async function GET() {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  try {
    const supabase = createSupabaseAdminClient();
    let q = supabase
      .from('contracts')
      .select('*, inquiries(name, company)')
      .order('created_at', { ascending: false });
    if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
    const { data, error } = await q;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contracts: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  try {
    const { cc_emails, bu_code: _ignored, ...body } = await req.json();
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('contracts')
      .insert({ ...body, bu_code: user.bu_code, sign_token: randomUUID() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contract: data });
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
    let q = supabase
      .from('contracts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
    const { data, error } = await q.select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contract: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
