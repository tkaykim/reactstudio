import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!note) {
    return NextResponse.json({ error: '메모를 입력해 주세요.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from('react_staff_applications')
    .select('id')
    .eq('id', id)
    .eq('bu_code', ADMIN_BU)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: '지원서를 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('react_staff_notes')
    .insert({
      application_id: id,
      note,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: { ...data, author_name: user.name } });
}
