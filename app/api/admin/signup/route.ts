import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';

const ALLOWED_BU_CODES = ['GRIGO', 'FLOW', 'REACT', 'MODOO', 'AST', 'HEAD'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const requested_bu_code = String(body.requested_bu_code ?? '');
    const signup_message = body.signup_message ? String(body.signup_message).trim() : null;

    if (!name || !email || !password) {
      return NextResponse.json({ error: '필수 항목을 입력하세요.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
    }
    if (!ALLOWED_BU_CODES.includes(requested_bu_code)) {
      return NextResponse.json({ error: '소속을 선택하세요.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from('app_users')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: existing.status === 'pending' ? '이미 신청된 이메일입니다. 승인을 기다려주세요.' : '이미 가입된 이메일입니다.' },
        { status: 409 }
      );
    }

    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (authErr || !created?.user) {
      return NextResponse.json({ error: authErr?.message ?? '계정 생성에 실패했습니다.' }, { status: 500 });
    }

    const { error: insertErr } = await admin.from('app_users').insert({
      id: created.user.id,
      name,
      email,
      role: 'member',
      bu_code: null,
      requested_bu_code,
      signup_message,
      signup_requested_at: new Date().toISOString(),
      status: 'pending',
    });

    if (insertErr) {
      // rollback auth user
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? '서버 오류' }, { status: 500 });
  }
}
