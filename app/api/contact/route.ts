import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { sendAdminNotification } from '@/lib/email';
import { CURRENT_BU_CODE } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, company, services, project_title, project_scale, deadline, budget_range, description, reference_urls, message } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    const filteredUrls = (reference_urls as string[] | undefined)?.filter((u: string) => u.trim()) ?? [];

    const supabase = createSupabaseAdminClient();
    const { error: dbError } = await supabase.from('inquiries').insert({
      bu_code: CURRENT_BU_CODE,
      name, email, phone, company, services, project_title: project_title || null, project_scale, deadline, budget_range,
      description: description || null,
      reference_urls: filteredUrls,
      reference_url: filteredUrls[0] || null,
      message,
      status: 'new',
    });

    if (dbError) {
      console.error('DB insert error:', dbError);
      return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
    }

    // Send admin notification (non-blocking)
    sendAdminNotification({ name, email, phone, company, services, description, reference_urls: filteredUrls, message }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Contact API error:', e);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
