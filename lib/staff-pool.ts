export const STAFF_FILES_BUCKET = 'react-staff-files';

export const STAFF_APPLICANT_TYPES = [
  {
    value: 'company',
    label: '제작사',
    description: '법인 또는 사업자로 운영되는 영상 제작사',
  },
  {
    value: 'team',
    label: '팀',
    description: '고정 팀 또는 프로젝트 단위 크루',
  },
  {
    value: 'individual',
    label: '개인',
    description: '프리랜서 또는 1인 작업자',
  },
] as const;

export type StaffApplicantType = (typeof STAFF_APPLICANT_TYPES)[number]['value'];

export const STAFF_STATUS_OPTIONS = [
  { value: 'new', label: '신규', className: 'bg-cyan-400/15 text-cyan-200 border-cyan-300/20' },
  { value: 'reviewing', label: '검토중', className: 'bg-amber-400/15 text-amber-200 border-amber-300/20' },
  { value: 'shortlisted', label: '후보', className: 'bg-lime-400/15 text-lime-200 border-lime-300/20' },
  { value: 'approved', label: '승인', className: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/20' },
  { value: 'archived', label: '보관', className: 'bg-white/10 text-white/55 border-white/10' },
  { value: 'rejected', label: '거절', className: 'bg-red-400/15 text-red-200 border-red-300/20' },
] as const;

export type StaffStatus = (typeof STAFF_STATUS_OPTIONS)[number]['value'];

export const STAFF_CAPABILITY_OPTIONS = [
  {
    value: 'planning',
    label: '기획',
    shortLabel: '기획',
    description: '콘셉트, 구성안, 프리프로덕션, 레퍼런스 설계',
    className: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
  },
  {
    value: 'shooting',
    label: '촬영',
    shortLabel: '촬영',
    description: '카메라, 조명, 현장 운영, 멀티캠, 라이브 클립',
    className: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  },
  {
    value: 'editing',
    label: '편집',
    shortLabel: '편집',
    description: '컷 편집, 컬러, 사운드, 버전 관리, 납품',
    className: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  },
  {
    value: 'template_motion',
    label: '템플릿 기반 모션그래픽',
    shortLabel: '템플릿 모션',
    description: 'MOGRT, AE 템플릿, 브랜드 패키지 응용',
    className: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
  },
  {
    value: 'custom_cg',
    label: '모션그래픽 자체 제작(CG)',
    shortLabel: 'CG 모션',
    description: 'After Effects, 3D, 합성, 타이틀, 그래픽 패키지',
    className: 'border-violet-300/25 bg-violet-300/10 text-violet-100',
  },
  {
    value: 'generative_ai',
    label: '생성형 AI',
    shortLabel: 'AI',
    description: '이미지, 영상, 프롬프트, 워크플로, AI 보정',
    className: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
  },
] as const;

export type StaffCapability = (typeof STAFF_CAPABILITY_OPTIONS)[number]['value'];

export const STAFF_PROFICIENCY_OPTIONS = [
  { value: 'assist', label: '보조 가능' },
  { value: 'working', label: '실무 가능' },
  { value: 'lead', label: '리드 가능' },
  { value: 'specialist', label: '전문 특화' },
] as const;

export type StaffProficiency = (typeof STAFF_PROFICIENCY_OPTIONS)[number]['value'];

export const STAFF_SKILL_GROUPS = [
  {
    value: 'planning',
    label: '기획',
    skills: [
      '콘셉트 기획',
      '구성안 작성',
      '촬영 콘티',
      '레퍼런스 리서치',
      '현장 디렉팅',
      '프리프로덕션 관리',
    ],
  },
  {
    value: 'shooting',
    label: '촬영',
    skills: [
      '일반 촬영',
      '예능 촬영',
      '공연 영상',
      '댄스 퍼포먼스 촬영',
      '짐벌 촬영',
      '지미집',
      '드론 촬영',
      '멀티캠',
      '라이브 클립',
      '인터뷰 촬영',
      '제품 촬영',
      '현장 오퍼레이팅',
    ],
  },
  {
    value: 'editing',
    label: '편집',
    skills: [
      '인제스트/싱크',
      '초편',
      '컷편집',
      '리듬 편집',
      '기본 자막',
      '디자인 자막',
      '색보정',
      '사운드 정리',
      '납품 버전 관리',
      '숏폼 리컷',
    ],
  },
  {
    value: 'motion',
    label: '모션그래픽/OAP',
    skills: [
      '템플릿 기반 모션',
      '자체 모션그래픽',
      'OAP',
      '타이틀 패키지',
      '로고 애니메이션',
      '합성',
      '2D 그래픽',
      '3D 그래픽',
      'CG/VFX',
    ],
  },
  {
    value: 'live',
    label: '송출/현장 시스템',
    skills: [
      '실시간 송출',
      '스위처 운용',
      '현장 녹화',
      'LED/스크린 송출',
      '오디오 라우팅',
      '라이브 스트리밍',
      '현장 데이터 백업',
    ],
  },
  {
    value: 'ai',
    label: '생성형 AI',
    skills: [
      'AI 이미지 생성',
      'AI 영상 생성',
      'AI 보정',
      '프롬프트 설계',
      'ComfyUI 워크플로',
      'AI 스토리보드',
      'AI 배경/소스 제작',
    ],
  },
] as const;

export type StaffSkillGroup = (typeof STAFF_SKILL_GROUPS)[number]['value'];

export const STAFF_RATE_UNITS = [
  { value: 'per_day', label: '1일' },
  { value: 'per_half_day', label: '반일' },
  { value: 'per_project', label: '프로젝트' },
  { value: 'per_video', label: '영상 1편' },
  { value: 'per_hour', label: '시간' },
  { value: 'monthly', label: '월' },
  { value: 'negotiable', label: '협의' },
] as const;

export type StaffRateUnit = (typeof STAFF_RATE_UNITS)[number]['value'];

export const STAFF_EXPERIENCE_LEVELS = [
  { value: 'junior', label: '주니어' },
  { value: 'mid', label: '미들' },
  { value: 'senior', label: '시니어' },
  { value: 'lead', label: '리드/감독급' },
  { value: 'specialist', label: '전문 특화' },
] as const;

export type StaffExperienceLevel = (typeof STAFF_EXPERIENCE_LEVELS)[number]['value'];

export const STAFF_TOOL_SUGGESTIONS = [
  'Premiere Pro',
  'After Effects',
  'DaVinci Resolve',
  'Final Cut Pro',
  'Photoshop',
  'Illustrator',
  'Blender',
  'Cinema 4D',
  'Unreal Engine',
  'Runway',
  'Kling',
  'Higgsfield',
  'ComfyUI',
  'Midjourney',
  'ChatGPT',
] as const;

export const STAFF_EQUIPMENT_SUGGESTIONS = [
  'Cinema Camera',
  'Mirrorless Camera',
  'Prime Lens',
  'Zoom Lens',
  'Lighting Kit',
  'Gimbal',
  'Tripod',
  'Drone',
  'Wireless Mic',
  'Field Recorder',
  'DIT Station',
  'Editing Workstation',
] as const;

export type StaffCapabilityInput = {
  category: StaffCapability;
  proficiency: StaffProficiency;
  role_detail: string;
  portfolio_urls: string[];
  tools: string[];
  equipment: string[];
  notes: string;
};

export type StaffSkillEntryInput = {
  group: StaffSkillGroup;
  skill_name: string;
  experience_level: StaffExperienceLevel;
  years_experience?: number | null;
  role_detail: string;
  representative_work_url?: string;
  tools: string[];
  equipment: string[];
  notes: string;
};

export type StaffRateCardInput = {
  skill_group: StaffSkillGroup;
  skill_name: string;
  rate_unit: StaffRateUnit;
  currency: 'KRW';
  min_amount?: number | null;
  max_amount?: number | null;
  is_negotiable: boolean;
  includes_equipment: boolean;
  notes: string;
};

export type StaffApplicationPayload = {
  applicant_type: StaffApplicantType;
  display_name: string;
  legal_name?: string;
  company_name?: string;
  representative_name?: string;
  contact_name?: string;
  phone: string;
  email: string;
  birth_date?: string;
  business_registration_number?: string;
  opened_on?: string;
  region?: string;
  website_url?: string;
  social_links: string[];
  portfolio_urls: string[];
  summary?: string;
  availability?: string;
  preferred_project_types: string[];
  equipment: string[];
  equipment_detail?: string;
  tools: string[];
  ai_tools: string[];
};

export type StaffFileRow = {
  id: number;
  application_id: number;
  document_type: string;
  bucket: string;
  object_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
};

export type StaffCapabilityRow = {
  id: number;
  application_id: number;
  category: StaffCapability;
  proficiency: StaffProficiency | null;
  role_detail: string | null;
  portfolio_urls: string[];
  tools: string[];
  equipment: string[];
  notes: string | null;
};

export type StaffSkillEntryRow = {
  id: number;
  application_id: number;
  skill_group: StaffSkillGroup;
  skill_name: string;
  experience_level: StaffExperienceLevel | null;
  years_experience: number | null;
  role_detail: string | null;
  representative_work_url: string | null;
  tools: string[];
  equipment: string[];
  notes: string | null;
};

export type StaffRateCardRow = {
  id: number;
  application_id: number;
  skill_group: StaffSkillGroup;
  skill_name: string | null;
  rate_unit: StaffRateUnit;
  currency: 'KRW';
  min_amount: number | null;
  max_amount: number | null;
  is_negotiable: boolean;
  includes_equipment: boolean;
  notes: string | null;
};

export type StaffNoteRow = {
  id: number;
  application_id: number;
  note: string;
  created_by: string | null;
  created_at: string;
  author_name?: string | null;
};

export type StaffApplicationRow = StaffApplicationPayload & {
  id: number;
  bu_code: 'REACT';
  status: StaffStatus;
  capability_tags: string[];
  raw_payload?: unknown;
  admin_rating: number | null;
  partner_id: number | null;
  created_partner_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  capabilities: StaffCapabilityRow[];
  skill_entries: StaffSkillEntryRow[];
  rate_cards: StaffRateCardRow[];
  files: StaffFileRow[];
  notes: StaffNoteRow[];
  partner_name?: string | null;
};

export function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeUrlList(value: string) {
  return splitLines(value).map((url) => {
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  });
}

export function statusLabel(status: string) {
  return STAFF_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function capabilityLabel(category: string) {
  return STAFF_CAPABILITY_OPTIONS.find((item) => item.value === category)?.label ?? category;
}

export function capabilityShortLabel(category: string) {
  return STAFF_CAPABILITY_OPTIONS.find((item) => item.value === category)?.shortLabel ?? category;
}

export function applicantTypeLabel(type: string) {
  return STAFF_APPLICANT_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function proficiencyLabel(value: string | null | undefined) {
  return STAFF_PROFICIENCY_OPTIONS.find((item) => item.value === value)?.label ?? '미기재';
}

export function skillGroupLabel(value: string | null | undefined) {
  return STAFF_SKILL_GROUPS.find((item) => item.value === value)?.label ?? value ?? '미기재';
}

export function experienceLevelLabel(value: string | null | undefined) {
  return STAFF_EXPERIENCE_LEVELS.find((item) => item.value === value)?.label ?? value ?? '미기재';
}

export function rateUnitLabel(value: string | null | undefined) {
  return STAFF_RATE_UNITS.find((item) => item.value === value)?.label ?? value ?? '협의';
}
