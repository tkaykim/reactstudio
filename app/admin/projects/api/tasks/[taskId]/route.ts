import { NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import type { AdminUser } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { canAccessProject } from '@/lib/project-permissions';

const ALLOWED_STATUSES = ['todo', 'in_progress', 'on_hold', 'done'] as const;

/**
 * 주어진 task가 admin 사용자의 접근 가능 프로젝트에 속하는지 검증.
 * 통과 시 supabase 클라이언트와 task row를 반환.
 */
async function loadTaskWithAccess(taskId: number, user: AdminUser) {
  const supabase = await createSupabaseServerClient();

  const { data: task, error: tErr } = await supabase
    .from('project_tasks')
    .select('id,project_id,bu_code')
    .eq('id', taskId)
    .eq('bu_code', ADMIN_BU)
    .maybeSingle();
  if (tErr) return { error: NextResponse.json({ error: tErr.message }, { status: 500 }) };
  if (!task) return { error: NextResponse.json({ error: 'task not found' }, { status: 404 }) };

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('pm_id,created_by,participants')
    .eq('id', task.project_id)
    .eq('bu_code', ADMIN_BU)
    .maybeSingle();
  if (pErr) return { error: NextResponse.json({ error: pErr.message }, { status: 500 }) };
  if (!project) return { error: NextResponse.json({ error: 'project not found' }, { status: 404 }) };

  if (
    !canAccessProject(user, {
      pm_id: (project as any).pm_id ?? null,
      created_by: (project as any).created_by ?? null,
      participants: (project as any).participants,
    })
  ) {
    return { error: NextResponse.json({ error: '권한 없음' }, { status: 403 }) };
  }

  return { supabase, task };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { taskId: tParam } = await ctx.params;
  const taskId = Number(tParam);
  if (!Number.isFinite(taskId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const patch: Record<string, unknown> = {};

  if ('status' in body) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if ('assignee_id' in body) patch.assignee_id = body.assignee_id || null;
  if ('due_date' in body) patch.due_date = body.due_date || null;
  if ('tag' in body) patch.tag = body.tag || null;
  if ('title' in body && typeof body.title === 'string') {
    if (!body.title.trim()) return NextResponse.json({ error: 'title 비어있음' }, { status: 400 });
    patch.title = body.title.trim();
  }
  if ('description' in body) patch.description = body.description ?? null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경 사항이 없습니다.' }, { status: 400 });
  }

  const access = await loadTaskWithAccess(taskId, user);
  if ('error' in access) return access.error;
  const { supabase } = access;

  const { data, error } = await supabase
    .from('project_tasks')
    .update(patch)
    .eq('id', taskId)
    .eq('bu_code', ADMIN_BU)
    .select('id,title,description,status,tag,due_date,assignee_id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { taskId: tParam } = await ctx.params;
  const taskId = Number(tParam);
  if (!Number.isFinite(taskId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const access = await loadTaskWithAccess(taskId, user);
  if ('error' in access) return access.error;
  const { supabase } = access;

  const { error } = await supabase
    .from('project_tasks')
    .delete()
    .eq('id', taskId)
    .eq('bu_code', ADMIN_BU);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
