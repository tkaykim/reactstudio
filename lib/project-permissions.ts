/**
 * Project access rules for /admin (REACT BU 한정).
 *
 * - admin role: 전체 프로젝트 접근
 * - 그 외 (leader/manager): 본인이 PM이거나 participants에 포함된 프로젝트만
 *
 * 참고: totalmanagements/src/lib/permissions.ts 의 canAccessProject 와 정책이 다름
 *       (이쪽은 reactstudio admin 전용 단순 규칙).
 */
import type { AdminUser } from './admin-auth';

/** projects.participants jsonb 한 항목의 형태 (다양한 레거시 포맷 허용) */
export type ParticipantRaw =
  | string
  | {
      user_id?: string | null;
      partner_worker_id?: number | null;
      partner_company_id?: number | null;
      role?: string | null;
      is_pm?: boolean;
      [k: string]: unknown;
    };

export interface ProjectAccessFields {
  pm_id: string | null;
  created_by: string | null;
  participants: unknown; // jsonb
}

/** participants jsonb에서 user_id 만 추출 */
export function extractParticipantUserIds(participants: unknown): string[] {
  if (!Array.isArray(participants)) return [];
  const ids: string[] = [];
  for (const p of participants) {
    if (typeof p === 'string') {
      ids.push(p);
    } else if (p && typeof p === 'object') {
      const uid = (p as ParticipantRaw as { user_id?: unknown }).user_id;
      if (typeof uid === 'string' && uid) ids.push(uid);
    }
  }
  return ids;
}

/** participants jsonb에서 partner_company_id 추출 */
export function extractParticipantPartnerIds(participants: unknown): number[] {
  if (!Array.isArray(participants)) return [];
  const ids: number[] = [];
  for (const p of participants) {
    if (p && typeof p === 'object') {
      const pid = (p as { partner_company_id?: unknown }).partner_company_id;
      if (typeof pid === 'number') ids.push(pid);
    }
  }
  return ids;
}

export function canAccessProject(user: AdminUser, project: ProjectAccessFields): boolean {
  if (user.role === 'admin') return true;
  if (project.pm_id && project.pm_id === user.id) return true;
  if (project.created_by && project.created_by === user.id) return true;
  return extractParticipantUserIds(project.participants).includes(user.id);
}

/** 수정 권한: admin / 생성자 / PM */
export function canEditProject(user: AdminUser, project: ProjectAccessFields): boolean {
  if (user.role === 'admin') return true;
  if (project.created_by && project.created_by === user.id) return true;
  if (project.pm_id && project.pm_id === user.id) return true;
  return false;
}

/** 삭제 권한: admin / 생성자 만 (PM 단독 삭제 금지) */
export function canDeleteProject(user: AdminUser, project: ProjectAccessFields): boolean {
  if (user.role === 'admin') return true;
  if (project.created_by && project.created_by === user.id) return true;
  return false;
}
