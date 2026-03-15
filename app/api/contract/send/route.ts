import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { transporter } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { contractId } = await req.json();

    if (!contractId) {
      return NextResponse.json({ error: '계약서 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error || !contract) {
      console.error('Contract fetch error:', error);
      return NextResponse.json({ error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!contract.client_email) {
      return NextResponse.json({ error: '고객 이메일이 없습니다.' }, { status: 400 });
    }

    const signUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/contract/sign/${contract.sign_token}`;

    try {
      await transporter.sendMail({
        from: `"React Studio" <${process.env.SMTP_USER}>`,
        to: contract.client_email,
        subject: `[React Studio] 계약서 서명 요청 - ${contract.title}`,
        html: `
          <h2>안녕하세요, ${contract.client_name}님</h2>
          <p><b>${contract.title}</b> 계약서가 준비되었습니다.</p>
          <p>아래 버튼을 클릭하여 계약 내용을 확인하고 서명해주세요.</p>
          <p style="margin:24px 0">
            <a href="${signUrl}" style="display:inline-block;padding:14px 32px;background-color:#FF4D00;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">
              계약서 확인 및 서명하기
            </a>
          </p>
          <table style="border-collapse:collapse;width:100%;margin-top:16px">
            <tr><td style="padding:8px;border:1px solid #ddd"><b>계약명</b></td><td style="padding:8px;border:1px solid #ddd">${contract.title}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>공급가액</b></td><td style="padding:8px;border:1px solid #ddd">${Number(contract.supply_amount).toLocaleString()}원</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>부가세 (10%)</b></td><td style="padding:8px;border:1px solid #ddd">${Number(contract.vat).toLocaleString()}원</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>합계 (VAT 포함)</b></td><td style="padding:8px;border:1px solid #ddd;font-weight:bold">${Number(contract.total_amount).toLocaleString()}원</td></tr>
            ${contract.start_date ? `<tr><td style="padding:8px;border:1px solid #ddd"><b>계약 기간</b></td><td style="padding:8px;border:1px solid #ddd">${contract.start_date} ~ ${contract.end_date || ''}</td></tr>` : ''}
          </table>
          <p style="margin-top:16px;color:#888;font-size:12px">위 버튼이 작동하지 않으면 아래 링크를 브라우저에 붙여넣기 해주세요:<br>${signUrl}</p>
          <br>
          <p><b>React Studio</b></p>
        `,
      });
    } catch (emailErr) {
      console.error('Contract email send error:', emailErr);
      const msg = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류';
      return NextResponse.json({ error: `이메일 발송 실패: ${msg}` }, { status: 500 });
    }

    await supabase
      .from('contracts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', contractId);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Contract send unexpected error:', e);
    const msg = e instanceof Error ? e.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
