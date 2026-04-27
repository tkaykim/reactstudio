import { NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { canAccessProject } from '@/lib/project-permissions';

const ALLOWED_STATUSES = ['todo', 'in_progress', 'on_hold', 'done'] as const;

export async function POST(req: Request) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const body = await req.json().catch(() => ({} as any));
  const project_id = Number(body.project_id);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const due_date = typeof body.due_date === 'string' && body.due_date ? body.due_date : null;
  const assignee_id = typeof body.assignee_id === 'string' && body.assignee_id ? body.assignee_id : null;
  const tag = typeof body.tag === 'string' && body.tag ? body.tag : null;
  const description = typeof body.description === 'string' ? body.description : null;
  const status = ALLOWED_STATUSES.includes(body.status) ? body.status : 'todo';

  if (!Number.isFinite(project_id) || !title) {
    return NextResponse.json({ error: 'project_id, title 필수' }, { status: 400 });
  }
  if (!due_date) {
    return NextResponse.json({ error: '마감일은 필수입니다.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id,bu_code,pm_id,created_by,participants')
    .eq('id', project_id)
    .eq('bu_code', ADMIN_BU)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  if (
    !canAccessProject(user, {
      pm_id: (project as any).pm_id ?? null,
      created_by: (project as any).created_by ?? null,
      participants: (project as any).participants,
    })
  ) {
    return NextResponse.json({ error: '이 프로젝트에 대한 권한이 없습니다.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('project_tasks')
    .insert({
      project_id,
      bu_code: ADMIN_BU,
      title,
      description,
      due_date,
      status,
      tag,
      assignee_id,
      created_by: user.id,
    })
    .select('id,title,description,status,tag,due_date,assignee_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
