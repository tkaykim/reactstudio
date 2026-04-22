import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { apiRequireAdmin, canManageSignups } from '@/lib/admin-auth';

export async function GET() {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  if (!canManageSignups(guard.user)) {
    return NextResponse.json({ error: 'HEAD 소속만 접근할 수 있습니다.' }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('app_users')
    .select('id, name, email, requested_bu_code, signup_message, signup_requested_at, status, created_at')
    .in('status', ['pending', 'rejected'])
    .order('signup_requested_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}
