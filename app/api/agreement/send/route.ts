import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { transporter } from '@/lib/email';
import { generateContractDocx } from '@/lib/generate-contract-docx';

export async function POST(req: NextRequest) {
  try {
    const { agreementId } = await req.json();

    if (!agreementId) {
      return NextResponse.json({ error: '계약서 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: agreement, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('id', agreementId)
      .single();

    if (error || !agreement) {
      return NextResponse.json({ error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!agreement.client_email) {
      return NextResponse.json({ error: '고객 이메일이 없습니다.' }, { status: 400 });
    }

    const docNumber = `RS-A${String(agreement.id).padStart(5, '0')}`;

    let docxBuffer: Buffer;
    try {
      docxBuffer = await generateContractDocx(agreement);
    } catch (docxErr) {
      console.error('DOCX generation error:', docxErr);
      return NextResponse.json(
        { error: 'DOCX 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    try {
      await transporter.sendMail({
        from: `"React Studio" <${process.env.SMTP_USER}>`,
        to: agreement.client_email,
        subject: `[React Studio] 계약서 초안 전달 - ${agreement.title} (${docNumber})`,
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111">
            <div style="border-bottom:3px solid #FF4D00;padding-bottom:16px;margin-bottom:24px">
              <table width="100%"><tr>
                <td><span style="font-size:24px;font-weight:bold;color:#FF4D00">REACT STUDIO</span><br><span style="font-size:12px;color:#888">영상제작 프로덕션</span></td>
                <td style="text-align:right"><span style="font-size:18px;font-weight:bold">계 약 서</span><br><span style="font-size:11px;color:#888">No. ${docNumber}</span></td>
              </tr></table>
            </div>

            <p style="font-size:14px;margin-bottom:4px">안녕하세요, <b>${agreement.client_company}</b> 담당자님.</p>
            <p style="font-size:14px;color:#333">React Studio입니다.</p>

            <p style="font-size:13px;color:#444;line-height:1.8;margin:20px 0">
              요청하신 프로젝트에 대한 <b>계약서 초안</b>을 전달드립니다.<br>
              첨부된 파일을 확인하시고, 수정이 필요한 부분이 있으시면 편하게 말씀해주세요.
            </p>

            <table style="border-collapse:collapse;width:100%;margin:20px 0">
              <tr><td style="padding:10px 12px;border:1px solid #eee;background:#f8f8f8;font-size:13px;width:140px"><b>프로젝트</b></td><td style="padding:10px 12px;border:1px solid #eee;font-size:13px">${agreement.title}</td></tr>
              <tr><td style="padding:10px 12px;border:1px solid #eee;background:#f8f8f8;font-size:13px"><b>계약 금액</b></td><td style="padding:10px 12px;border:1px solid #eee;font-size:13px;font-weight:bold;color:#FF4D00">₩${Number(agreement.total_amount).toLocaleString()} (${agreement.vat_type === 'exclusive' ? 'VAT 별도' : 'VAT 포함'})</td></tr>
              ${agreement.shooting_date ? `<tr><td style="padding:10px 12px;border:1px solid #eee;background:#f8f8f8;font-size:13px"><b>촬영 예정일</b></td><td style="padding:10px 12px;border:1px solid #eee;font-size:13px">${agreement.shooting_date}</td></tr>` : ''}
            </table>

            <p style="font-size:13px;color:#444;line-height:1.8;margin:20px 0">
              계약 내용에 이상이 없으시면 회신 부탁드리며,<br>
              궁금한 점이 있으시면 언제든지 연락주세요.
            </p>

            <p style="font-size:13px;color:#111;margin-top:28px">감사합니다.</p>

            <div style="border-top:1px solid #eee;padding-top:16px;margin-top:28px">
              <p style="font-size:13px;font-weight:bold;color:#FF4D00;margin:0 0 4px">React Studio</p>
              <p style="font-size:12px;color:#888;margin:0">react.studio.kr@gmail.com</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `ReactStudio_계약서_${docNumber}.docx`,
            content: docxBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
      });
    } catch (emailErr) {
      console.error('Agreement email send error:', emailErr);
      const msg = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류';
      return NextResponse.json({ error: `이메일 발송 실패: ${msg}` }, { status: 500 });
    }

    await supabase
      .from('agreements')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', agreementId);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Agreement send unexpected error:', e);
    const msg = e instanceof Error ? e.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
