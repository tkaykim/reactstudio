export type BuCode = 'GRIGO' | 'FLOW' | 'REACT' | 'MODOO' | 'AST' | 'HEAD';

export const CURRENT_BU_CODE: BuCode = 'REACT';

export interface PortfolioItem {
  id: number;
  bu_code: BuCode;
  youtube_video_id: string;
  youtube_playlist_id: string;
  title: string;
  thumbnail_url: string;
  category: string;
  client: string | null;
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
  { value: 'service', label: '용역 계약' },
  { value: 'production', label: '영상 제작 계약' },
  { value: 'channel_operation', label: '채널 운영 계약' },
  { value: 'outsource', label: '외주 계약' },
];

export interface SiteSetting {
  key: string;
  value: string;
}

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
