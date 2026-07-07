import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import {
  STAFF_AVAILABILITY_DAYS,
  STAFF_AVAILABILITY_STATUSES,
  type StaffAvailabilityDay,
  type StaffAvailabilityStatus,
} from '@/lib/staff-availability';

type RouteContext = {
  params: Promise<{ token: string }>;
};

const allowedStatuses = STAFF_AVAILABILITY_STATUSES
  .map((item) => item.value)
  .filter((value) => value !== 'pending') as StaffAvailabilityStatus[];
const allowedDays: StaffAvailabilityDay[] = STAFF_AVAILABILITY_DAYS.map((item) => item.value);

function cleanText(value: unknown, max = 1000) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const responseStatus = body.response_status;

  if (typeof responseStatus !== 'string' || !allowedStatuses.includes(responseStatus as StaffAvailabilityStatus)) {
    return NextResponse.json({ error: '응답값이 올바르지 않습니다.' }, { status: 400 });
  }

  const daysInput: unknown[] = Array.isArray(body.available_days) ? body.available_days : [];
  const days = daysInput
    .map(String)
    .filter((item: string): item is StaffAvailabilityDay => allowedDays.includes(item as StaffAvailabilityDay));

  if ((responseStatus === 'available' || responseStatus === 'maybe') && days.length === 0) {
    return NextResponse.json({ error: '가능한 요일을 하나 이상 선택해 주세요.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing, error: loadError } = await supabase
    .from('react_staff_availability_polls')
    .select('id')
    .eq('token', token)
    .eq('bu_code', 'REACT')
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 404 });

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;
  const { data, error } = await supabase
    .from('react_staff_availability_polls')
    .update({
      response_status: responseStatus,
      available_days: responseStatus === 'unavailable' ? [] : days,
      preferred_time: cleanText(body.preferred_time),
      rate_note: cleanText(body.rate_note),
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
