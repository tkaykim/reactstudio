import nodemailer from 'nodemailer';

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      `SMTP 환경변수 누락: ${!user ? 'SMTP_USER' : ''} ${!pass ? 'SMTP_PASS' : ''}`.trim()
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });
}

export { getTransporter as transporter_factory };

export const transporter = {
  async sendMail(options: nodemailer.SendMailOptions) {
    const t = getTransporter();
    return t.sendMail(options);
  },
};

export async function sendAdminNotification(inquiry: {
  name: string;
  email: string;
  phone: string;
  company: string;
  services: string[];
  description?: string;
  reference_urls?: string[];
  message: string;
}) {
  if (!process.env.ADMIN_EMAIL) {
    console.warn('ADMIN_EMAIL 환경변수가 설정되지 않아 알림 이메일을 건너뜁니다.');
    return;
  }

  const refRows = inquiry.reference_urls?.length
    ? inquiry.reference_urls.map((u) => `<a href="${u}" style="color:#FF4D00">${u}</a>`).join('<br>')
    : '-';

  await transporter.sendMail({
    from: `"React Studio" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `[React Studio] 새 문의 - ${inquiry.name} (${inquiry.company || '개인'})`,
    html: `
      <h2>새 문의가 접수되었습니다</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;border:1px solid #ddd"><b>이름</b></td><td style="padding:8px;border:1px solid #ddd">${inquiry.name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><b>이메일</b></td><td style="padding:8px;border:1px solid #ddd">${inquiry.email}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><b>전화번호</b></td><td style="padding:8px;border:1px solid #ddd">${inquiry.phone}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><b>회사명</b></td><td style="padding:8px;border:1px solid #ddd">${inquiry.company || '-'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><b>서비스</b></td><td style="padding:8px;border:1px solid #ddd">${inquiry.services.join(', ')}</td></tr>
        ${inquiry.description ? `<tr><td style="padding:8px;border:1px solid #ddd"><b>상세 설명</b></td><td style="padding:8px;border:1px solid #ddd;white-space:pre-wrap">${inquiry.description}</td></tr>` : ''}
        <tr><td style="padding:8px;border:1px solid #ddd"><b>레퍼런스</b></td><td style="padding:8px;border:1px solid #ddd">${refRows}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><b>메시지</b></td><td style="padding:8px;border:1px solid #ddd">${inquiry.message}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/inquiries">관리자 페이지에서 확인하기</a></p>
    `,
  });
}

interface QuoteEmailData {
  id: number;
  items: { name: string; qty: number; unit_price: number; amount: number }[];
  supply_amount: number;
  vat: number;
  total_amount: number;
  valid_until?: string | null;
  notes?: string | null;
}

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export async function sendQuoteEmail(
  to: string,
  clientName: string,
  pdfBuffer: Buffer,
  viewUrl?: string,
  quote?: QuoteEmailData,
  clientCompany?: string,
  projectTitle?: string
) {
  const today = new Date().toLocaleDateString('ko-KR');
  const docNumber = quote ? `RS-${String(quote.id).padStart(6, '0')}` : '';

  const itemRows = quote?.items?.map((item, i) => `
    <tr style="background:${i % 2 === 1 ? '#fafafa' : '#fff'}">
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right">${formatKRW(item.unit_price)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right">${formatKRW(item.amount)}</td>
    </tr>
  `).join('') || '';

  const quoteBody = quote ? `
    <div style="max-width:600px;margin:0 auto;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111">
      <!-- Header -->
      <div style="border-bottom:3px solid #FF4D00;padding-bottom:16px;margin-bottom:24px">
        <table width="100%"><tr>
          <td><span style="font-size:24px;font-weight:bold;color:#FF4D00">REACT STUDIO</span><br><span style="font-size:12px;color:#888">(주) 그리고 엔터테인먼트 영상프로덕션</span></td>
          <td style="text-align:right"><span style="font-size:18px;font-weight:bold">견 적 서</span><br><span style="font-size:11px;color:#888">No. ${docNumber}</span></td>
        </tr></table>
      </div>

      ${projectTitle ? `
      <!-- Project Title -->
      <div style="background:#111;border-radius:4px;padding:12px 16px;margin-bottom:20px">
        <span style="font-size:10px;color:#FF4D00;text-transform:uppercase">PROJECT</span><br>
        <b style="font-size:16px;color:#fff">${projectTitle}</b>
      </div>
      ` : ''}

      <!-- Info -->
      <table width="100%" style="margin-bottom:20px">
        <tr>
          <td style="background:#f8f8f8;padding:12px;border-radius:4px;width:33%">
            <span style="font-size:10px;color:#888;text-transform:uppercase">수신</span><br>
            <b style="font-size:14px">${clientName} 님</b>
            ${clientCompany ? `<br><span style="font-size:12px;color:#666">${clientCompany}</span>` : ''}
          </td>
          <td style="width:8px"></td>
          <td style="background:#f8f8f8;padding:12px;border-radius:4px;width:33%">
            <span style="font-size:10px;color:#888;text-transform:uppercase">발행일</span><br>
            <b style="font-size:14px">${today}</b>
          </td>
          <td style="width:8px"></td>
          <td style="background:#f8f8f8;padding:12px;border-radius:4px;width:33%">
            <span style="font-size:10px;color:#888;text-transform:uppercase">유효기간</span><br>
            <b style="font-size:14px">${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('ko-KR') : '발행일로부터 30일'}</b>
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <table width="100%" style="border-collapse:collapse;margin-bottom:8px">
        <tr style="background:#111">
          <td style="padding:10px 12px;color:#fff;font-size:12px;font-weight:bold">품목</td>
          <td style="padding:10px 12px;color:#fff;font-size:12px;font-weight:bold;text-align:center">수량</td>
          <td style="padding:10px 12px;color:#fff;font-size:12px;font-weight:bold;text-align:right">단가</td>
          <td style="padding:10px 12px;color:#fff;font-size:12px;font-weight:bold;text-align:right">금액</td>
        </tr>
        ${itemRows}
      </table>

      <!-- Totals -->
      <table width="280" style="margin-left:auto;margin-bottom:24px">
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666">공급가액</td>
          <td style="padding:4px 0;font-size:12px;text-align:right">${formatKRW(quote.supply_amount)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666">부가세 (10%)</td>
          <td style="padding:4px 0;font-size:12px;text-align:right">${formatKRW(quote.vat)}</td>
        </tr>
        <tr style="border-top:2px solid #FF4D00">
          <td style="padding:10px 0;font-size:15px;font-weight:bold">합계</td>
          <td style="padding:10px 0;font-size:15px;font-weight:bold;text-align:right;color:#FF4D00">${formatKRW(quote.total_amount)}</td>
        </tr>
      </table>

      ${quote.notes ? `
      <div style="background:#fff8f5;border-left:3px solid #FF4D00;padding:12px;margin-bottom:24px">
        <span style="font-size:10px;color:#FF4D00;font-weight:bold;text-transform:uppercase">비고</span>
        <p style="margin:4px 0 0;font-size:12px;color:#444;line-height:1.6">${quote.notes}</p>
      </div>
      ` : ''}

      ${viewUrl ? `
      <div style="text-align:center;margin:24px 0">
        <a href="${viewUrl}" style="display:inline-block;padding:14px 32px;background-color:#FF4D00;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px">
          온라인에서 견적 승인/응답하기
        </a>
        <p style="color:#888;font-size:11px;margin-top:8px">버튼이 작동하지 않으면: ${viewUrl}</p>
      </div>
      ` : ''}

      <p style="font-size:13px;color:#444">문의사항이 있으시면 언제든지 연락주세요.</p>

      <!-- Footer -->
      <div style="border-top:1px solid #eee;padding-top:12px;margin-top:24px">
        <span style="font-size:11px;color:#aaa">React Studio | (주) 그리고 엔터테인먼트 영상프로덕션</span><br>
        <span style="font-size:10px;color:#bbb">사업자등록번호 116-81-96848 | 서울특별시 마포구 성지3길 55, 3층 | 대표 김현준</span><br>
        <span style="font-size:11px;color:#aaa">react.studio.kr@gmail.com</span>
      </div>
    </div>
  ` : `
    <h2>안녕하세요, ${clientName}님</h2>
    <p>요청하신 견적서를 첨부 파일로 보내드립니다.</p>
    <p>문의사항이 있으시면 언제든지 연락주세요.</p>
    <br>
    <p><b>React Studio</b></p>
    <p style="font-size:12px;color:#888">(주) 그리고 엔터테인먼트 | 영상프로덕션 브랜드</p>
  `;

  await transporter.sendMail({
    from: `"React Studio" <${process.env.SMTP_USER}>`,
    to,
    subject: `[React Studio] 견적서${projectTitle ? ` - ${projectTitle}` : ''}${docNumber ? ` (${docNumber})` : ''}`,
    html: quoteBody,
    attachments: [
      {
        filename: `ReactStudio_견적서${docNumber ? `_${docNumber}` : ''}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
