import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { transporter } from '@/lib/email';
import { renderToBuffer } from '@react-pdf/renderer';
import { buildContractDocument } from '@/components/sections/ContractDocument';
import { loadCompanyDocAttachments, type CompanyDocKind } from '@/lib/company-docs';

export async function POST(req: NextRequest) {
  try {
    const { contractId, ccEmails, attachDocs } = await req.json();

    if (!contractId) {
      return NextResponse.json({ error: '견적서 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error || !contract) {
      console.error('Contract fetch error:', error);
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!contract.client_email) {
      return NextResponse.json({ error: '고객 이메일이 없습니다.' }, { status: 400 });
    }

    const docNumber = `RS-C${String(contract.id).padStart(5, '0')}`;

    let pdfBuffer: Buffer;
    try {
      const rawBuffer = await renderToBuffer(buildContractDocument({ contract }));
      pdfBuffer = Buffer.from(rawBuffer);
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      return NextResponse.json(
        { error: 'PDF 생성에 실패했습니다. 견적서 항목을 확인해주세요.' },
        { status: 500 }
      );
    }

    const extraDocs = await loadCompanyDocAttachments(attachDocs as CompanyDocKind[] | undefined);

    try {
      const cc = ccEmails?.length ? ccEmails : undefined;

      await transporter.sendMail({
        from: `"React Studio" <${process.env.SMTP_USER}>`,
        to: contract.client_email,
        ...(cc ? { cc } : {}),
        subject: `[React Studio] 견적서 전달 - ${contract.title} (${docNumber})`,
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111">
            <div style="border-bottom:3px solid #FF4D00;padding-bottom:16px;margin-bottom:24px">
              <table width="100%"><tr>
                <td><span style="font-size:24px;font-weight:bold;color:#FF4D00">REACT STUDIO</span><br><span style="font-size:12px;color:#888">(주) 그리고 엔터테인먼트 영상프로덕션</span></td>
                <td style="text-align:right"><span style="font-size:18px;font-weight:bold">견 적 서</span><br><span style="font-size:11px;color:#888">No. ${docNumber}</span></td>
              </tr></table>
            </div>

            <p style="font-size:14px;margin-bottom:4px">안녕하세요, <b>${contract.client_name}</b>님.</p>
            <p style="font-size:14px;color:#333">React Studio입니다.</p>

            <p style="font-size:13px;color:#444;line-height:1.8;margin:20px 0">
              문의해주신 건에 대한 견적서를 전달드립니다.<br>
              첨부된 PDF 파일에서 상세 내역을 확인하실 수 있습니다.
            </p>

            <table style="border-collapse:collapse;width:100%;margin:20px 0">
              <tr><td style="padding:10px 12px;border:1px solid #eee;background:#f8f8f8;font-size:13px;width:140px"><b>견적명</b></td><td style="padding:10px 12px;border:1px solid #eee;font-size:13px">${contract.title}</td></tr>
              <tr><td style="padding:10px 12px;border:1px solid #eee;background:#f8f8f8;font-size:13px"><b>합계 (VAT 포함)</b></td><td style="padding:10px 12px;border:1px solid #eee;font-size:13px;font-weight:bold;color:#FF4D00">${Number(contract.total_amount).toLocaleString()}원</td></tr>
              ${contract.start_date ? `<tr><td style="padding:10px 12px;border:1px solid #eee;background:#f8f8f8;font-size:13px"><b>예상 기간</b></td><td style="padding:10px 12px;border:1px solid #eee;font-size:13px">${contract.start_date} ~ ${contract.end_date || ''}</td></tr>` : ''}
            </table>

            <p style="font-size:13px;color:#444;line-height:1.8;margin:20px 0">
              견적 내용 관련 문의사항이나 조정이 필요하신 부분이 있으시면<br>
              편하게 연락주시기 바랍니다.
            </p>

            <p style="font-size:13px;color:#111;margin-top:28px">감사합니다.</p>

            <div style="border-top:1px solid #eee;padding-top:16px;margin-top:28px">
              <p style="font-size:13px;font-weight:bold;color:#FF4D00;margin:0 0 4px">React Studio</p>
              <p style="font-size:11px;color:#999;margin:0 0 2px">(주) 그리고 엔터테인먼트 영상프로덕션</p>
              <p style="font-size:10px;color:#bbb;margin:0 0 4px">사업자등록번호 116-81-96848 | 서울특별시 마포구 성지3길 55, 3층 | 대표 김현준</p>
              <p style="font-size:12px;color:#888;margin:0">react.studio.kr@gmail.com</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `ReactStudio_견적서_${docNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
          ...extraDocs,
        ],
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
