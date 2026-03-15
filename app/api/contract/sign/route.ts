import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { transporter } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { token, signatureData } = await req.json();

    if (!token || !signatureData) {
      return NextResponse.json({ error: '서명 데이터가 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: contract, error: fetchErr } = await supabase
      .from('contracts')
      .select('*')
      .eq('sign_token', token)
      .in('status', ['sent', 'viewed'])
      .single();

    if (fetchErr || !contract) {
      return NextResponse.json({ error: '서명 가능한 계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { error: updateErr } = await supabase
      .from('contracts')
      .update({
        client_signature_data: signatureData,
        client_signed_at: new Date().toISOString(),
        status: 'signed',
      })
      .eq('id', contract.id);

    if (updateErr) {
      return NextResponse.json({ error: '서명 저장에 실패했습니다.' }, { status: 500 });
    }

    transporter.sendMail({
      from: `"React Studio" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `[계약 서명 완료] ${contract.client_name}님 - ${contract.title}`,
      html: `
        <h2>계약서 서명이 완료되었습니다</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #ddd"><b>고객</b></td><td style="padding:8px;border:1px solid #ddd">${contract.client_name} (${contract.client_company || '개인'})</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>계약명</b></td><td style="padding:8px;border:1px solid #ddd">${contract.title}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>계약 금액</b></td><td style="padding:8px;border:1px solid #ddd">${Number(contract.total_amount).toLocaleString()}원</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>서명 시각</b></td><td style="padding:8px;border:1px solid #ddd">${new Date().toLocaleString('ko-KR')}</td></tr>
        </table>
        <p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/contracts">관리자 페이지에서 확인하기</a></p>
      `,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
