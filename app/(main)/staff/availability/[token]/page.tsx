import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase';
import {
  rateBandLabel,
  staffAvailabilityProjectForKey,
  type StaffAvailabilityPollRow,
} from '@/lib/staff-availability';
import StaffAvailabilityClient from './StaffAvailabilityClient';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'REACT 프로젝트 가능 여부',
  description: 'REACT Studio 프로젝트 진행 가능 여부를 알려주세요.',
  robots: { index: false, follow: false },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StaffAvailabilityPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('react_staff_availability_polls')
    .select('*')
    .eq('token', token)
    .eq('bu_code', 'REACT')
    .maybeSingle();

  if (error) console.error('[staff/availability] load failed', error);
  if (!data) notFound();

  let poll = data as StaffAvailabilityPollRow;

  // 메일 본문의 원클릭 버튼(?a=y&r=b3 / ?a=n)으로 들어온 응답을 페이지 진입 시 바로 접수한다.
  // 메일 클라이언트는 form 전송을 막기 때문에 링크 클릭 자체가 제출이 되도록 한 경로다.
  const quickAnswer = firstParam(query.a);
  const quickBand = firstParam(query.r);
  let quickApplied: 'available' | 'unavailable' | null = null;

  if (quickAnswer === 'y' || quickAnswer === 'n') {
    const project = staffAvailabilityProjectForKey(poll.project_key);
    const responseStatus = quickAnswer === 'y' ? 'available' : 'unavailable';
    const bandLabel = quickAnswer === 'y' ? rateBandLabel(poll.project_key, quickBand) : null;
    const { data: updated, error: updateError } = await supabase
      .from('react_staff_availability_polls')
      .update({
        response_status: responseStatus,
        preferred_time:
          responseStatus === 'available'
            ? project.preferredTimeWhenAvailable
            : project.preferredTimeWhenUnavailable,
        // 불가능으로 바꾸면 이전 단가 답변이 남아 관리자 화면에 모순되게 보이므로 비운다.
        rate_note:
          responseStatus === 'unavailable' ? null : bandLabel ? `${bandLabel} (메일 원클릭 응답)` : poll.rate_note,
        submitted_at: new Date().toISOString(),
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', poll.id)
      .select('*')
      .single();

    if (updateError) console.error('[staff/availability] quick answer failed', updateError);
    if (updated) {
      poll = updated as StaffAvailabilityPollRow;
      quickApplied = responseStatus;
    }
  } else {
    await supabase
      .from('react_staff_availability_polls')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('id', poll.id);
  }

  return <StaffAvailabilityClient initialPoll={poll} quickApplied={quickApplied} />;
}
