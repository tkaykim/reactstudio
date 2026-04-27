import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import {
  canAccessProject,
  canEditProject,
  canDeleteProject,
  extractParticipantUserIds,
  extractParticipantPartnerIds,
} from '@/lib/project-permissions';
import ProjectDetailClient, {
  type ProjectDetail,
  type TaskRow,
  type AssigneeOption,
  type PartnerOption,
  type ParticipantEntry,
} from './ProjectDetailClient';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminUser = await requireAdmin();
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const supabase = await createSupabaseServerClient();

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select(
      'id,name,status,start_date,end_date,bu_code,description,pm_id,partner_id,created_by,participants,pm:app_users!fk_projects_pm_id(id,name),partner:partners!projects_partner_id_fkey(id,display_name)'
    )
    .eq('id', id)
    .eq('bu_code', ADMIN_BU)
    .maybeSingle();

  if (pErr) console.error('[admin/projects/:id] project fetch', pErr);
  if (!project) notFound();

  const accessFields = {
    pm_id: (project as any).pm_id ?? null,
    created_by: (project as any).created_by ?? null,
    participants: (project as any).participants,
  };
  if (!canAccessProject(adminUser, accessFields)) notFound();
  const editable = canEditProject(adminUser, accessFields);
  const deletable = canDeleteProject(adminUser, accessFields);

  const { data: taskData } = await supabase
    .from('project_tasks')
    .select('id,title,description,status,tag,due_date,priority,assignee:app_users!project_tasks_assignee_id_fkey(id,name)')
    .eq('project_id', id)
    .eq('bu_code', ADMIN_BU)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });

  const tasks: TaskRow[] = (taskData ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    tag: t.tag,
    due_date: t.due_date,
    assignee_id: t.assignee?.id ?? null,
    assignee_name: t.assignee?.name ?? null,
  }));

  // 담당자 후보 (REACT BU active app_users) — 직원 선택지로도 재사용
  const { data: assigneeData } = await supabase
    .from('app_users')
    .select('id,name')
    .eq('bu_code', ADMIN_BU)
    .eq('status', 'active')
    .order('name');

  const assignees: AssigneeOption[] = (assigneeData ?? []).map((u: any) => ({
    id: u.id,
    name: u.name,
  }));

  // 파트너(외주업체/외주담당자) 풀 — entity_type 으로 구분
  const { data: partnerData } = await supabase
    .from('partners')
    .select('id,display_name,entity_type,is_active')
    .eq('is_active', true)
    .order('display_name');

  const partnerCompanies: PartnerOption[] = [];
  const partnerWorkers: PartnerOption[] = [];
  for (const p of (partnerData ?? []) as Array<{
    id: number;
    display_name: string;
    entity_type: string;
  }>) {
    const opt = { id: p.id, name: p.display_name };
    if (p.entity_type === 'person') partnerWorkers.push(opt);
    else partnerCompanies.push(opt);
  }

  // participants 이름 resolve
  const userIds = extractParticipantUserIds((project as any).participants);
  const partnerIds = extractParticipantPartnerIds((project as any).participants);
  const pmId: string | null = (project as any).pm_id ?? null;
  const userIdsToFetch = Array.from(new Set(userIds.filter((u) => u !== pmId)));

  const [extraUsersRes, partnersRes] = await Promise.all([
    userIdsToFetch.length
      ? supabase.from('app_users').select('id,name').in('id', userIdsToFetch)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    partnerIds.length
      ? supabase.from('partners').select('id,display_name').in('id', partnerIds)
      : Promise.resolve({ data: [] as { id: number; display_name: string }[] }),
  ]);

  const userNameMap = new Map<string, string>();
  for (const u of (extraUsersRes.data ?? []) as { id: string; name: string }[]) {
    userNameMap.set(u.id, u.name);
  }
  // PM 이름도 user map 에 포함 (참여자 목록 표기용)
  if (pmId && (project as any).pm?.name) userNameMap.set(pmId, (project as any).pm.name);
  for (const u of assignees) if (!userNameMap.has(u.id)) userNameMap.set(u.id, u.name);

  const partnerNameMap = new Map<number, string>();
  for (const p of (partnersRes.data ?? []) as { id: number; display_name: string }[]) {
    partnerNameMap.set(p.id, p.display_name);
  }
  for (const w of partnerWorkers) if (!partnerNameMap.has(w.id)) partnerNameMap.set(w.id, w.name);
  for (const c of partnerCompanies) if (!partnerNameMap.has(c.id)) partnerNameMap.set(c.id, c.name);

  const memberNames: string[] = [];
  const participantEntries: ParticipantEntry[] = [];
  if (Array.isArray((project as any).participants)) {
    for (const part of (project as any).participants) {
      if (typeof part === 'string') {
        if (part === pmId) continue;
        const nm = userNameMap.get(part) ?? '?';
        memberNames.push(nm);
        participantEntries.push({ kind: 'user', id: part, name: nm });
      } else if (part && typeof part === 'object') {
        const uid = (part as any).user_id;
        const wid = (part as any).partner_worker_id;
        const cid = (part as any).partner_company_id;
        if (typeof uid === 'string' && uid) {
          if (uid === pmId) continue;
          const nm = userNameMap.get(uid) ?? '?';
          memberNames.push(nm);
          participantEntries.push({ kind: 'user', id: uid, name: nm });
        } else if (typeof wid === 'number') {
          const nm = partnerNameMap.get(wid) ?? '?';
          memberNames.push(nm);
          participantEntries.push({ kind: 'partner_worker', id: wid, name: nm });
        } else if (typeof cid === 'number') {
          const nm = partnerNameMap.get(cid) ?? '?';
          memberNames.push(nm);
          participantEntries.push({ kind: 'partner_company', id: cid, name: nm });
        }
      }
    }
  }

  const detail: ProjectDetail = {
    id: project.id,
    name: project.name,
    status: project.status,
    start_date: (project as any).start_date ?? null,
    end_date: project.end_date,
    description: (project as any).description ?? null,
    pm_id: pmId,
    pm_name: (project as any).pm?.name ?? null,
    partner_id: (project as any).partner_id ?? null,
    partner_name: (project as any).partner?.display_name ?? null,
    member_names: memberNames,
    participants: participantEntries,
  };

  return (
    <ProjectDetailClient
      project={detail}
      initialTasks={tasks}
      assignees={assignees}
      partnerCompanies={partnerCompanies}
      partnerWorkers={partnerWorkers}
      isAdmin={adminUser.role === 'admin'}
      canEdit={editable}
      canDelete={deletable}
    />
  );
}
