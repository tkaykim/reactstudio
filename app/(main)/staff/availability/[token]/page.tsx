import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase';
import type { StaffAvailabilityPollRow } from '@/lib/staff-availability';
import StaffAvailabilityClient from './StaffAvailabilityClient';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  title: 'REACT 프로젝트 가능 여부',
  description: 'REACT Studio 프로젝트 진행 가능 여부를 알려주세요.',
  robots: { index: false, follow: false },
};

export default async function StaffAvailabilityPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('react_staff_availability_polls')
    .select('*')
    .eq('token', token)
    .eq('bu_code', 'REACT')
    .maybeSingle();

  if (error) console.error('[staff/availability] load failed', error);
  if (!data) notFound();

  await supabase
    .from('react_staff_availability_polls')
    .update({ last_viewed_at: new Date().toISOString() })
    .eq('id', data.id);

  return <StaffAvailabilityClient initialPoll={data as StaffAvailabilityPollRow} />;
}
