import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { sendQuoteEmail } from '@/lib/email';
import { renderToBuffer } from '@react-pdf/renderer';
import { buildQuoteDocument } from '@/components/sections/QuoteDocument';

export async function POST(req: NextRequest) {
  try {
    const { quoteId, ccEmails } = await req.json();

    if (!quoteId) {
      return NextResponse.json({ error: '견적서 ID가 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: quote, error: qErr } = await supabase
      .from('quotes')
      .select('*, inquiries(*)')
      .eq('id', quoteId)
      .single();

    if (qErr || !quote) {
      console.error('Quote fetch error:', qErr);
      return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 });
    }

    const inquiry = quote.inquiries;
    if (!inquiry?.email) {
      return NextResponse.json({ error: '고객 이메일이 없습니다.' }, { status: 400 });
    }

    let pdfBuffer: Buffer;
    try {
      const rawBuffer = await renderToBuffer(
        buildQuoteDocument({ quote, clientName: inquiry.name, clientCompany: inquiry.company, projectTitle: inquiry.project_title })
      );
      pdfBuffer = Buffer.from(rawBuffer);
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      return NextResponse.json(
        { error: 'PDF 생성에 실패했습니다. 견적서 항목을 확인해주세요.' },
        { status: 500 }
      );
    }

    const viewUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/quote/${quote.view_token}`;

    try {
      const cc = ccEmails?.length ? ccEmails : (quote.cc_emails?.length ? quote.cc_emails : undefined);
      await sendQuoteEmail(inquiry.email, inquiry.name, pdfBuffer, viewUrl, quote, inquiry.company, inquiry.project_title, cc);
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      const msg = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류';
      return NextResponse.json(
        { error: `이메일 발송 실패: ${msg}` },
        { status: 500 }
      );
    }

    await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        client_response: 'pending',
      })
      .eq('id', quoteId);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Send quote unexpected error:', e);
    const msg = e instanceof Error ? e.message : '서버 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
