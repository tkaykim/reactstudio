import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { sendAdminNotification } from '@/lib/email';
import { CURRENT_BU_CODE } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, phone, company, services,
      project_title, project_scale, deadline, budget_range,
      description, reference_urls, message,
      content_types, video_count, meeting_preference,
      preferred_date, preferred_time_slot, additional_request,
      custom_service,
    } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
    }

    const filteredUrls = (reference_urls as string[] | undefined)?.filter((u: string) => u.trim()) ?? [];

    const extraParts: string[] = [];
    if (content_types?.length) extraParts.push(`[콘텐츠유형] ${(content_types as string[]).join(', ')}`);
    if (video_count) extraParts.push(`[제작편수] ${video_count}`);
    if (meeting_preference) extraParts.push(`[미팅] ${meeting_preference}`);
    if (preferred_date) extraParts.push(`[희망일정] ${preferred_date} ${preferred_time_slot || ''}`);
    if (custom_service) extraParts.push(`[기타서비스] ${custom_service}`);
    if (additional_request) extraParts.push(`[추가요청] ${additional_request}`);

    const combinedMessage = [message, ...extraParts].filter(Boolean).join('\n');

    // Structured mirror of the wizard fields. Stored alongside `message` so the
    // existing admin UI/email pipelines (which read `message`) keep working,
    // while ERP/BI consumers can query the JSONB directly.
    const intakePayload: Record<string, unknown> = {
      ...(content_types?.length ? { content_types } : {}),
      ...(video_count ? { video_count } : {}),
      ...(meeting_preference ? { meeting_preference } : {}),
      ...(preferred_date ? { preferred_date } : {}),
      ...(preferred_time_slot ? { preferred_time_slot } : {}),
      ...(custom_service ? { custom_service } : {}),
      ...(additional_request ? { additional_request } : {}),
      ...(filteredUrls.length ? { reference_urls: filteredUrls } : {}),
    };

    const supabase = createSupabaseAdminClient();
    const { error: dbError } = await supabase.from('inquiries').insert({
      bu_code: CURRENT_BU_CODE,
      name, email, phone, company, services,
      project_title: project_title || null,
      project_scale: project_scale || null,
      deadline: deadline || null,
      budget_range: budget_range || null,
      description: description || null,
      reference_urls: filteredUrls,
      reference_url: filteredUrls[0] || null,
      message: combinedMessage,
      intake_payload: intakePayload,
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
