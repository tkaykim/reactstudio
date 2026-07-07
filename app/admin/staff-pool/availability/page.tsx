import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import {
  ageSignalLabel,
  availabilityScheduleLabel,
  availabilityStatusLabel,
  STAFF_AVAILABILITY_STATUSES,
  type StaffAvailabilityPollRow,
} from '@/lib/staff-availability';

export const dynamic = 'force-dynamic';

type PollWithApplication = StaffAvailabilityPollRow & {
  application?: {
    id: number;
    display_name: string;
    email: string;
    phone: string;
    status: string;
  } | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function statusTone(status: string) {
  return STAFF_AVAILABILITY_STATUSES.find((item) => item.value === status)?.tone ?? 'border-white/10 text-white/45';
}

export default async function StaffAvailabilityAdminPage() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('react_staff_availability_polls')
    .select('*,application:react_staff_applications(id,display_name,email,phone,status)')
    .eq('bu_code', 'REACT')
    .order('created_at', { ascending: false });

  if (error) console.error('[admin/staff-pool/availability] polls', error);

  const rows = (data ?? []) as PollWithApplication[];
  const counts = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.response_status] = (acc[row.response_status] ?? 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/staff-pool"
            className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-white/45 transition hover:text-brand"
          >
            <ArrowLeft size={14} />
            스탭풀로 돌아가기
          </Link>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand">고정 일정</p>
          <h1 className="mt-1 text-2xl font-black text-white">댄스학원 고정건 응답 현황</h1>
          <p className="mt-1 text-xs text-white/40">
            전체 {counts.total ?? 0}명 · 가능 {counts.available ?? 0}명 · 불가능 {counts.unavailable ?? 0}명 · 미응답 {counts.pending ?? 0}명
            {counts.maybe ? ` · 확인필요 ${counts.maybe}명` : ''}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-white/10">
        <div className="grid grid-cols-[1.15fr_0.8fr_0.9fr_1.1fr_1.1fr] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
          <span>Candidate</span>
          <span>Response</span>
          <span>Age</span>
          <span>Details</span>
          <span>Link</span>
        </div>
        <div className="divide-y divide-white/5">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-white/35">아직 생성된 가능 여부 링크가 없습니다.</div>
          ) : (
            rows.map((row) => {
              const name = row.application?.display_name ?? row.invitee_name ?? '이름 미확인';
              const email = row.application?.email ?? row.invitee_email ?? '';
              const publicUrl = `/staff/availability/${row.token}`;
              return (
                <div key={row.id} className="grid grid-cols-[1.15fr_0.8fr_0.9fr_1.1fr_1.1fr] gap-3 px-4 py-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{name}</p>
                    <p className="mt-1 truncate text-xs text-white/40">{email || '이메일 미확인'}</p>
                    {row.application_id && (
                      <Link
                        href={`/admin/staff-pool?selected=${row.application_id}`}
                        className="mt-2 inline-flex text-xs font-bold text-brand hover:text-white"
                      >
                        스탭풀 #{row.application_id}
                      </Link>
                    )}
                  </div>
                  <div>
                    <span className={cls('inline-flex rounded border px-2 py-1 text-xs font-bold', statusTone(row.response_status))}>
                      {availabilityStatusLabel(row.response_status)}
                    </span>
                    <p className="mt-2 text-xs text-white/35">{formatDateTime(row.submitted_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">{ageSignalLabel(row.age_signal)}</p>
                    <p className="mt-1 text-xs text-white/35">
                      {row.age_estimate ? `${row.age_estimate}세 추정` : '추정 없음'}
                    </p>
                    {row.age_evidence && <p className="mt-1 line-clamp-2 text-xs text-white/35">{row.age_evidence}</p>}
                  </div>
                  <div className="space-y-1 text-xs leading-relaxed text-white/55">
                    <p>일정: {availabilityScheduleLabel(row)}</p>
                    <p>금액: {row.rate_note || '-'}</p>
                    {row.message && <p className="line-clamp-2">메모: {row.message}</p>}
                  </div>
                  <div className="min-w-0">
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-xs font-bold text-white/60 transition hover:border-brand hover:text-brand"
                    >
                      응답 링크 열기
                      <ExternalLink size={13} />
                    </a>
                    <p className="mt-2 break-all text-[11px] text-white/25">{publicUrl}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
