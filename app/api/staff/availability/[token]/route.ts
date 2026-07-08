import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import {
  REQUIRED_AVAILABILITY_DAYS,
  STAFF_AVAILABILITY_PROJECT,
  staffAvailabilityProjectForKey,
} from '@/lib/staff-availability';

type RouteContext = {
  params: Promise<{ token: string }>;
};

const allowedStatuses = ['available', 'unavailable'] as const;
type PublicAvailabilityStatus = (typeof allowedStatuses)[number];

function cleanText(value: unknown, max = 1000) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const responseStatus = body.response_status;

  if (typeof responseStatus !== 'string' || !allowedStatuses.includes(responseStatus as PublicAvailabilityStatus)) {
    return NextResponse.json({ error: '응답값이 올바르지 않습니다.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing, error: loadError } = await supabase
    .from('react_staff_availability_polls')
    .select('id,project_key')
    .eq('token', token)
    .eq('bu_code', 'REACT')
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 404 });

  const project = staffAvailabilityProjectForKey(existing.project_key);
  const rateNote = cleanText(body.rate_note, 500);
  if (project.rateRequiredWhenAvailable && responseStatus === 'available' && !rateNote) {
    return NextResponse.json({ error: '기준 단가를 함께 남겨주세요.' }, { status: 400 });
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;
  const { data, error } = await supabase
    .from('react_staff_availability_polls')
    .update({
      response_status: responseStatus,
      available_days:
        existing.project_key === STAFF_AVAILABILITY_PROJECT.key && responseStatus === 'available'
          ? [...REQUIRED_AVAILABILITY_DAYS]
          : [],
      preferred_time:
        responseStatus === 'available'
          ? project.preferredTimeWhenAvailable
          : project.preferredTimeWhenUnavailable,
      rate_note: rateNote,
      equipment_note: cleanText(body.equipment_note),
      message: cleanText(body.message, 2000),
      submitted_at: new Date().toISOString(),
      user_agent: userAgent,
    })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ poll: data });
}
