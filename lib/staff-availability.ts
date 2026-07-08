export const STAFF_AVAILABILITY_PROJECTS = {
  mid_dance_school_weekly: {
    key: 'mid_dance_school_weekly',
    title: '이대역 댄스학원 정기 영상 촬영·편집',
    label: '고정 촬영·편집건',
    heading: '고정 촬영·편집건 가능 여부를 알려주세요.',
    intro: [
      '보내주신 내용을 바탕으로 먼저 검토 중입니다.',
      '이번 고정 일정이 어렵더라도 이후 프로젝트 연락을 위해 스탭풀 등록은 이어갈 수 있습니다.',
    ],
    location: '이대역 근방',
    schedule: '매주 목·금·토 오후 6시 50분부터 밤 10시 30분까지',
    workload: '현장 기준 약 3시간 40분',
    flow: '촬영 후 현장 편집 PC에서 준비된 프리셋과 플러그인을 적용하고 채널 업로드까지 진행',
    availableDescription: '목·금·토 18:50~22:30 고정 일정이 모두 가능합니다.',
    unavailableDescription: '이번 고정건은 어렵지만 스탭풀 등록은 계속할 수 있습니다.',
    equipmentLabel: '장비·툴 참고',
    equipmentPlaceholder: '예: 개인 카메라 사용 가능, 현장 PC 편집 가능',
    messagePlaceholder: '불가능한 경우에도 스탭풀 등록 희망 여부나 참고 내용을 남겨주세요.',
    submitLabel: '가능 여부 저장하기',
    savedSubmitLabel: '응답 수정하기',
    savedAvailableDetail: '목·금·토 18:50~22:30 전체 가능',
    preferredTimeWhenAvailable: '목·금·토 18:50~22:30 전체 가능',
    preferredTimeWhenUnavailable: null,
    rateRequiredWhenAvailable: false,
    rateLabel: null,
    ratePlaceholder: null,
    ctaLabel: '댄스학원 영상건 가능 여부 입력하기',
  },
  seoul_event_drone_5h: {
    key: 'seoul_event_drone_5h',
    title: '서울 행사 스케치 드론 촬영',
    label: '행사 드론 촬영',
    heading: '서울 행사 드론 촬영 가능 여부를 알려주세요.',
    intro: [
      '커뮤니티 공지로 안내드렸던 댄스학원 영상 건은 구인이 완료되었습니다.',
      '이후 축제·행사 영상 문의가 들어왔을 때 빠르게 확인드리기 위해 드론 촬영 가능 여부와 기준 단가를 정리하고 있습니다.',
    ],
    location: '서울',
    schedule: '행사 5시간 내외 기준',
    workload: '축제·행사 현장 스케치 촬영',
    flow: '드론 촬영 가능 여부와 5시간 기준 스케치 드론 촬영 단가를 확인',
    availableDescription: '서울 지역 행사에서 드론 촬영이 가능합니다.',
    unavailableDescription: '현재 행사 드론 촬영은 어렵지만 스탭풀 등록은 계속할 수 있습니다.',
    equipmentLabel: '드론 장비·운영 참고',
    equipmentPlaceholder: '예: 보유 드론 기체, 항공 촬영 경험, 보험·허가 진행 경험 등',
    messagePlaceholder: '행사 촬영 경험, 가능 지역, 별도 조건이 있으면 남겨주세요.',
    submitLabel: '응답 저장하기',
    savedSubmitLabel: '응답 수정하기',
    savedAvailableDetail: '서울 행사 5시간 기준 드론 촬영 가능',
    preferredTimeWhenAvailable: '서울 행사 5시간 기준 스케치 드론 촬영 가능',
    preferredTimeWhenUnavailable: '서울 행사 5시간 기준 스케치 드론 촬영 불가능',
    rateRequiredWhenAvailable: true,
    rateLabel: '5시간 기준 스케치 드론 촬영 단가',
    ratePlaceholder: '예: 5시간 기준 600,000원, 부가세 별도 / 포함 여부 등',
    ctaLabel: '행사 드론 촬영 가능 여부 남기기',
  },
} as const;

export const STAFF_AVAILABILITY_PROJECT = STAFF_AVAILABILITY_PROJECTS.mid_dance_school_weekly;

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

export type StaffAvailabilityProjectKey = keyof typeof STAFF_AVAILABILITY_PROJECTS;

export function staffAvailabilityProjectForKey(key: string | null | undefined) {
  return STAFF_AVAILABILITY_PROJECTS[(key || '') as StaffAvailabilityProjectKey] ?? STAFF_AVAILABILITY_PROJECT;
}

export function availabilityStatusLabel(value: string | null | undefined) {
  return STAFF_AVAILABILITY_STATUSES.find((item) => item.value === value)?.label ?? '미응답';
}

export function availabilityDayLabel(value: string) {
  return STAFF_AVAILABILITY_DAYS.find((item) => item.value === value)?.label ?? value;
}

export function availabilityScheduleLabel(
  poll: Pick<StaffAvailabilityPollRow, 'project_key' | 'response_status' | 'available_days' | 'preferred_time'>
) {
  const project = staffAvailabilityProjectForKey(poll.project_key);
  if (poll.response_status === 'available') return poll.preferred_time || project.preferredTimeWhenAvailable;
  if (poll.response_status === 'unavailable') return poll.preferred_time || project.preferredTimeWhenUnavailable || '이번 일정 불가능';
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
