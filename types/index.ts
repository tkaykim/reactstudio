export type BuCode = 'GRIGO' | 'FLOW' | 'REACT' | 'MODOO' | 'AST' | 'HEAD';

export const CURRENT_BU_CODE: BuCode = 'REACT';

export interface PortfolioItem {
  id: number;
  bu_code: BuCode;
  youtube_video_id: string;
  youtube_playlist_id: string | null;
  title: string;
  thumbnail_url: string;
  category: string;
  client: string | null;
  credits: string | null;
  display_order: number;
  is_visible: boolean;
  published_at: string | null;
  created_at: string;
}

export interface Inquiry {
  id: number;
  bu_code: BuCode;
  name: string;
  email: string;
  phone: string;
  company: string;
  services: string[];
  project_title: string | null;
  project_scale: string;
  deadline: string | null;
  budget_range: string;
  description: string | null;
  reference_url: string | null;
  reference_urls: string[];
  message: string;
  status: 'new' | 'in_progress' | 'done';
  client_token: string | null;
  project_id: number | null;
  created_at: string;
}

export interface QuoteItem {
  name: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface Quote {
  id: number;
  bu_code: BuCode;
  inquiry_id: number;
  items: QuoteItem[];
  supply_amount: number;
  vat: number;
  total_amount: number;
  valid_until: string;
  notes: string;
  status: 'draft' | 'sent';
  sent_at: string | null;
  view_token: string | null;
  client_response: 'pending' | 'approved' | 'revision_requested' | 'rejected' | null;
  client_response_at: string | null;
  client_response_note: string | null;
  created_at: string;
}

export interface Contract {
  id: number;
  bu_code: BuCode;
  inquiry_id: number | null;
  quote_id: number | null;
  project_id: number | null;
  title: string;
  contract_type: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_company: string | null;
  items: QuoteItem[];
  supply_amount: number;
  vat: number;
  total_amount: number;
  deposit_amount: number;
  deposit_due_date: string | null;
  balance_amount: number;
  balance_due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  terms: string | null;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'cancelled';
  sign_token: string | null;
  client_signature_data: string | null;
  client_signed_at: string | null;
  company_signature_data: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CONTRACT_TYPES = [
  { value: 'service', label: '용역' },
  { value: 'production', label: '영상 제작' },
  { value: 'channel_operation', label: '채널 운영' },
  { value: 'outsource', label: '외주' },
];

export interface PenaltyRate {
  label: string;
  rate: number;
}

export interface Agreement {
  id: number;
  bu_code: BuCode;
  inquiry_id: number | null;
  quote_id: number | null;
  title: string;
  client_company: string;
  client_address: string;
  client_representative: string;
  client_email: string;
  client_phone: string;
  task_description: string;
  deliverables: string;
  shooting_date: string | null;
  delivery_date: string | null;
  release_date: string | null;
  total_amount: number;
  vat_type: 'exclusive' | 'inclusive';
  deposit_rate: number;
  deposit_amount: number;
  balance_rate: number;
  balance_amount: number;
  deposit_condition: string;
  balance_condition: string;
  free_revision_count: number;
  penalty_rates: PenaltyRate[];
  contract_date: string | null;
  status: 'draft' | 'sent';
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  bu_code: BuCode;
  name: string;
  logo_url: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: string;
}

export type FinancialKind = 'revenue' | 'expense';
export type FinancialStatus = 'planned' | 'paid' | 'canceled';
export type PaymentMethod = 'vat_included' | 'tax_free' | 'withholding' | 'actual_payment';

export interface FinancialEntry {
  id: number;
  project_id: number | null;
  bu_code: BuCode;
  kind: FinancialKind;
  category: string | null;
  name: string | null;
  amount: number | null;
  actual_amount: number | null;
  occurred_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  status: FinancialStatus;
  payment_method: PaymentMethod | null;
  partner_id: number | null;
  payee_app_user_id: string | null;
  share_rate: number | null;
  approved_by: string | null;
  approved_at: string | null;
  payment_ref: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  vat_included: '부가세 포함',
  tax_free: '면세',
  withholding: '원천징수 (3.3%)',
  actual_payment: '실지급',
};

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  planned: '지급예정',
  paid: '지급완료',
  canceled: '취소',
};

export type ServiceCategory =
  | '전체'
  | '뮤직비디오'
  | '댄스비디오/퍼포먼스'
  | '라이브 클립'
  | '웹예능';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  '전체',
  '뮤직비디오',
  '댄스비디오/퍼포먼스',
  '라이브 클립',
  '웹예능',
];

export const BUDGET_RANGES = [
  '~300만원',
  '~500만원',
  '~1000만원',
  '~3000만원',
  '3000만원 이상',
  '협의',
];

export const PROJECT_SCALES: { value: string; description: string }[] = [
  { value: '소형', description: '단일 영상, 소규모 팀, 1~2일 내외 촬영' },
  { value: '중형', description: '여러 씬·장소, 1~2주 일정, 중간 규모 팀·장비' },
  { value: '대형', description: '다수 에피소드·캠페인, 대규모 팀·장비, 장기 일정' },
];

// --- Start Wizard ---

export type ContentType = 'artwork' | 'entertainment' | 'commercial';

export const CONTENT_TYPES: {
  value: ContentType;
  title: string;
  subtitle: string;
  description: string;
  services: string[];
}[] = [
  {
    value: 'artwork',
    title: '아트워크',
    subtitle: 'Artwork',
    description: '아티스트의 음악과 퍼포먼스를 영상으로',
    services: ['뮤직비디오', '댄스비디오/퍼포먼스', '라이브 클립'],
  },
  {
    value: 'entertainment',
    title: '엔터테인먼트',
    subtitle: 'Entertainment',
    description: '시청자를 사로잡는 콘텐츠',
    services: ['웹예능', '숏폼'],
  },
  {
    value: 'commercial',
    title: '커머셜',
    subtitle: 'Commercial',
    description: '브랜드와 제품의 가치를 전달',
    services: ['홍보영상', '브랜드필름', '제품광고', '공간광고', '기타'],
  },
];

export const SERVICE_TO_PORTFOLIO_CATEGORY: Record<string, string> = {
  '뮤직비디오': '뮤직비디오',
  '댄스비디오/퍼포먼스': '댄스비디오/퍼포먼스',
  '라이브 클립': '라이브 클립',
  '웹예능': '웹예능',
  '숏폼': '웹예능',
  '홍보영상': '뮤직비디오',
  '브랜드필름': '뮤직비디오',
  '제품광고': '뮤직비디오',
  '공간광고': '뮤직비디오',
  '기타': '',
};

export const VIDEO_COUNTS = ['1편', '2~3편', '4~5편', '6편 이상', '미정'] as const;

export const MEETING_PREFERENCES = [
  { value: 'in_person', label: '대면 미팅', description: '직접 만나서 상담' },
  { value: 'video_call', label: '화상 미팅', description: 'Zoom, Google Meet 등' },
  { value: 'phone_call', label: '전화 상담', description: '간단한 통화로 진행' },
  { value: 'none', label: '미팅 없이 진행', description: '메일/메시지로 소통' },
] as const;

export const TIME_SLOTS = ['오전 (9~12시)', '오후 (12~18시)', '저녁 (18시 이후)', '무관'] as const;

export interface StartFormData {
  content_types: ContentType[];
  services: string[];
  custom_service: string;
  video_count: string;
  project_scale: string;
  description: string;
  reference_urls: string[];
  budget_range: string;
  deadline: string;
  deadline_flexible: boolean;
  meeting_preference: string;
  preferred_date: string;
  preferred_time_slot: string;
  additional_request: string;
  name: string;
  company: string;
  email: string;
  phone: string;
}
