import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canManageSignups } from '@/lib/admin-auth';

const ALLOWED_BU_CODES = ['GRIGO', 'FLOW', 'REACT', 'MODOO', 'AST', 'HEAD'];
const ALLOWED_ROLES = ['admin', 'leader', 'manager', 'member', 'viewer', 'artist'];

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!canManageSignups(guard.user)) {
    return NextResponse.json({ error: 'HEAD 소속만 접근할 수 있습니다.' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const bu_code = String(body.bu_code ?? '');
  const role = String(body.role ?? 'member');

  if (!ALLOWED_BU_CODES.includes(bu_code)) {
    return NextResponse.json({ error: '유효하지 않은 BU입니다.' }, { status: 400 });
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: '유효하지 않은 role입니다.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('app_users')
    .update({
      bu_code,
      role,
      status: 'active',
      approved_by: guard.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '신청을 찾을 수 없거나 이미 처리되었습니다.' }, { status: 404 });

  return NextResponse.json({ user: data });
}
