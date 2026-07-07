export const STAFF_AVAILABILITY_PROJECT = {
  key: 'mid_dance_school_weekly',
  title: '이대역 댄스학원 정기 영상 촬영·편집',
  location: '이대역 근방',
  schedule: '매주 목·금·토 오후 6시 50분부터 밤 10시 30분까지',
  workload: '현장 기준 약 3시간 40분',
  flow: '촬영 후 현장 편집 PC에서 준비된 프리셋과 플러그인을 적용하고 채널 업로드까지 진행',
} as const;

export const STAFF_AVAILABILITY_STATUSES = [
  { value: 'pending', label: '미응답', tone: 'border-white/10 bg-white/[0.04] text-white/50' },
  { value: 'available', label: '가능', tone: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' },
  { value: 'maybe', label: '확인 필요', tone: 'border-amber-300/25 bg-amber-300/10 text-amber-100' },
  { value: 'unavailable', label: '불가능', tone: 'border-white/10 bg-white/[0.04] text-white/45' },
] as const;

export const STAFF_AVAILABILITY_DAYS = [
  { value: 'thu', label: '목요일' },
  { value: 'fri', label: '금요일' },
  { value: 'sat', label: '토요일' },
] as const;

export const REQUIRED_AVAILABILITY_DAYS = ['thu', 'fri', 'sat'] as const;
export const REQUIRED_AVAILABILITY_TIME = '목·금·토 18:50~22:30 전체 가능';

export type StaffAvailabilityStatus = (typeof STAFF_AVAILABILITY_STATUSES)[number]['value'];
export type StaffAvailabilityDay = (typeof STAFF_AVAILABILITY_DAYS)[number]['value'];
export type StaffAgeSignal = 'target' | 'maybe' | 'unknown' | 'out_of_range';

export type StaffAvailabilityPollRow = {
  id: number;
  bu_code: 'REACT';
  application_id: number | null;
  token: string;
  mailbox: string | null;
  source_uid: string | null;
  source_message_id: string | null;
  source_subject: string | null;
  invitee_name: string | null;
  invitee_email: string | null;
  invitee_phone: string | null;
  project_key: string;
  project_title: string;
  candidate_snapshot: Record<string, unknown>;
  age_signal: StaffAgeSignal;
  age_estimate: number | null;
  age_evidence: string | null;
  response_status: StaffAvailabilityStatus;
  available_days: StaffAvailabilityDay[];
  preferred_time: string | null;
  rate_note: string | null;
  equipment_note: string | null;
  message: string | null;
  submitted_at: string | null;
  last_viewed_at: string | null;
  user_agent: string | null;
  ip_hint: string | null;
  created_at: string;
  updated_at: string;
};

export function availabilityStatusLabel(value: string | null | undefined) {
  return STAFF_AVAILABILITY_STATUSES.find((item) => item.value === value)?.label ?? '미응답';
}

export function availabilityDayLabel(value: string) {
  return STAFF_AVAILABILITY_DAYS.find((item) => item.value === value)?.label ?? value;
}

export function availabilityScheduleLabel(
  poll: Pick<StaffAvailabilityPollRow, 'response_status' | 'available_days' | 'preferred_time'>
) {
  if (poll.response_status === 'available') return poll.preferred_time || REQUIRED_AVAILABILITY_TIME;
  if (poll.response_status === 'unavailable') return '이번 고정 일정 불가능';
  if (poll.preferred_time) return poll.preferred_time;
  if (poll.available_days.length) return poll.available_days.map(availabilityDayLabel).join(', ');
  return '-';
}

export function ageSignalLabel(value: string | null | undefined) {
  if (value === 'target') return '우선 검토';
  if (value === 'maybe') return '추정 필요';
  if (value === 'out_of_range') return '후순위';
  return '불명';
}
