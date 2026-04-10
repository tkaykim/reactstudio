import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('sign_token', token)
      .in('status', ['sent', 'viewed', 'signed'])
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (contract.status === 'sent') {
      await supabase
        .from('contracts')
        .update({ status: 'viewed' })
        .eq('id', contract.id);
      contract.status = 'viewed';
    }

    return NextResponse.json({ contract });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
