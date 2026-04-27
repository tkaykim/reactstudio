import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import {
  canAccessProject,
  extractParticipantUserIds,
  extractParticipantPartnerIds,
} from '@/lib/project-permissions';
import ProjectsClient, { type ProjectRow } from './ProjectsClient';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const adminUser = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('projects')
    .select(
      'id,name,status,end_date,pm_id,created_by,participants,pm:app_users!fk_projects_pm_id(id,name),partner:partners!projects_partner_id_fkey(id,display_name),tasks:project_tasks(status)'
    )
    .eq('bu_code', ADMIN_BU)
    .order('end_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[admin/projects] fetch error', error);
  }

  const all = (data ?? []) as any[];

  // role 권한 필터
  const accessible = all.filter((p) =>
    canAccessProject(adminUser, {
      pm_id: p.pm_id ?? null,
      created_by: p.created_by ?? null,
      participants: p.participants,
    })
  );

  // participants 이름 일괄 조회
  const userIdSet = new Set<string>();
  const partnerIdSet = new Set<number>();
  for (const p of accessible) {
    extractParticipantUserIds(p.participants).forEach((id) => userIdSet.add(id));
    extractParticipantPartnerIds(p.participants).forEach((id) => partnerIdSet.add(id));
  }
  // PM이 participants에 없을 수도 있으니 추가 (이름 표시용)
  for (const p of accessible) if (p.pm_id) userIdSet.add(p.pm_id);

  const userIdList = Array.from(userIdSet);
  const partnerIdList = Array.from(partnerIdSet);

  const [usersRes, partnersRes] = await Promise.all([
    userIdList.length
      ? supabase.from('app_users').select('id,name').in('id', userIdList)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    partnerIdList.length
      ? supabase.from('partners').select('id,display_name').in('id', partnerIdList)
      : Promise.resolve({ data: [] as { id: number; display_name: string }[] }),
  ]);

  const userNameMap = new Map<string, string>();
  for (const u of (usersRes.data ?? []) as { id: string; name: string }[]) {
    userNameMap.set(u.id, u.name);
  }
  const partnerNameMap = new Map<number, string>();
  for (const p of (partnersRes.data ?? []) as { id: number; display_name: string }[]) {
    partnerNameMap.set(p.id, p.display_name);
  }

  function buildMembers(p: any): { pm_name: string | null; member_names: string[] } {
    const pmId: string | null = p.pm_id ?? null;
    const pmName = pmId ? userNameMap.get(pmId) ?? p.pm?.name ?? null : p.pm?.name ?? null;
    const members: string[] = [];
    if (Array.isArray(p.participants)) {
      for (const part of p.participants) {
        if (typeof part === 'string') {
          if (part === pmId) continue;
          const nm = userNameMap.get(part);
          if (nm) members.push(nm);
        } else if (part && typeof part === 'object') {
          const uid = (part as any).user_id;
          const wid = (part as any).partner_company_id;
          if (typeof uid === 'string' && uid) {
            if (uid === pmId) continue;
            const nm = userNameMap.get(uid);
            if (nm) members.push(nm);
          } else if (typeof wid === 'number') {
            const nm = partnerNameMap.get(wid);
            if (nm) members.push(nm);
          }
        }
      }
    }
    return { pm_name: pmName, member_names: members };
  }

  const projects: ProjectRow[] = accessible.map((p: any) => {
    const tasks = (p.tasks ?? []) as { status: string }[];
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const { pm_name, member_names } = buildMembers(p);
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      end_date: p.end_date,
      pm_name,
      member_names,
      partner_name: p.partner?.display_name ?? null,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
      task_total: total,
      task_done: done,
    };
  });

  return <ProjectsClient initialProjects={projects} isAdmin={adminUser.role === 'admin'} />;
}
