export const TASK_CATEGORIES = [
  'CAST',
  'SYSTEM',
  'VENUE',
  'POSTER',
  'RECRUIT',
  'STAFF',
  'PROMO',
  'SNS',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  CAST: '출연',
  SYSTEM: '시스템',
  VENUE: '대관',
  POSTER: '포스터',
  RECRUIT: '모집',
  STAFF: '스태프',
  PROMO: '홍보',
  SNS: 'SNS',
};

export const TASK_CATEGORY_COLOR: Record<TaskCategory, string> = {
  CAST: 'bg-brand/20 text-brand',
  SYSTEM: 'bg-blue-500/20 text-blue-400',
  VENUE: 'bg-green-500/20 text-green-400',
  POSTER: 'bg-purple-500/20 text-purple-400',
  RECRUIT: 'bg-pink-500/20 text-pink-400',
  STAFF: 'bg-amber-500/20 text-amber-400',
  PROMO: 'bg-cyan-500/20 text-cyan-400',
  SNS: 'bg-rose-500/20 text-rose-400',
};

export type TaskStatus = 'todo' | 'in_progress' | 'on_hold' | 'done';

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string; className: string }[] = [
  { value: 'todo', label: '대기', className: 'bg-white/10 text-white/60' },
  { value: 'in_progress', label: '진행', className: 'bg-brand/20 text-brand border border-brand/40' },
  { value: 'on_hold', label: '블로커', className: 'bg-red-500/20 text-red-400 border border-red-500/40' },
  { value: 'done', label: '완료', className: 'bg-green-500/20 text-green-400 border border-green-500/40' },
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '대기',
  in_progress: '진행',
  on_hold: '블로커',
  done: '완료',
};

export type ProjectStatus = '준비중' | '기획중' | '진행중' | '운영중' | '보류' | '완료';

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  준비중: 'bg-white/10 text-white/60',
  기획중: 'bg-brand/20 text-brand',
  진행중: 'bg-blue-500/20 text-blue-400',
  운영중: 'bg-blue-500/20 text-blue-400',
  보류: 'bg-red-500/20 text-red-400',
  완료: 'bg-green-500/20 text-green-400',
};

export function formatProjectCode(id: number): string {
  return `P-${String(id).padStart(3, '0')}`;
}

export function isTaskCategory(v: unknown): v is TaskCategory {
  return typeof v === 'string' && (TASK_CATEGORIES as readonly string[]).includes(v);
}
