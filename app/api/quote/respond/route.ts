import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { sendAdminNotification as sendMail } from '@/lib/email';
import { transporter } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { token, response, note } = await req.json();

    if (!token || !response) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const validResponses = ['approved', 'revision_requested', 'rejected'];
    if (!validResponses.includes(response)) {
      return NextResponse.json({ error: '유효하지 않은 응답입니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: quote, error: fetchErr } = await supabase
      .from('quotes')
      .select('*, inquiries(name, email, company)')
      .eq('view_token', token)
      .eq('status', 'sent')
      .single();

    if (fetchErr || !quote) {
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (quote.client_response && quote.client_response !== 'pending') {
      return NextResponse.json({ error: '이미 응답이 완료된 견적서입니다.' }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('quotes')
      .update({
        client_response: response,
        client_response_at: new Date().toISOString(),
        client_response_note: note || null,
      })
      .eq('id', quote.id);

    if (updateErr) {
      return NextResponse.json({ error: '응답 처리에 실패했습니다.' }, { status: 500 });
    }

    const inquiry = quote.inquiries;
    const responseLabel = {
      approved: '승인',
      revision_requested: '수정 요청',
      rejected: '거절',
    }[response as string] ?? response;

    transporter.sendMail({
      from: `"React Studio" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `[견적 ${responseLabel}] ${inquiry.name}님 (${inquiry.company || '개인'})`,
      html: `
        <h2>견적서 응답이 도착했습니다</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #ddd"><b>고객</b></td><td style="padding:8px;border:1px solid #ddd">${inquiry.name} (${inquiry.company || '개인'})</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>견적 번호</b></td><td style="padding:8px;border:1px solid #ddd">RS-${String(quote.id).padStart(6, '0')}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>견적 금액</b></td><td style="padding:8px;border:1px solid #ddd">${Number(quote.total_amount).toLocaleString()}원</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>응답</b></td><td style="padding:8px;border:1px solid #ddd;color:${response === 'approved' ? 'green' : response === 'rejected' ? 'red' : 'orange'};font-weight:bold">${responseLabel}</td></tr>
          ${note ? `<tr><td style="padding:8px;border:1px solid #ddd"><b>메모</b></td><td style="padding:8px;border:1px solid #ddd">${note}</td></tr>` : ''}
        </table>
        <p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/inquiries">관리자 페이지에서 확인하기</a></p>
      `,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
