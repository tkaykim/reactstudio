import { NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { canEditProject, canDeleteProject } from '@/lib/project-permissions';

const ALLOWED_PROJECT_STATUSES = [
  '준비중',
  '기획중',
  '진행중',
  '운영중',
  '보류',
  '완료',
] as const;

type ParticipantInput = {
  user_id?: string | null;
  partner_worker_id?: number | null;
  partner_company_id?: number | null;
  role?: string;
  is_pm?: boolean;
};

function normalizeParticipants(input: unknown): ParticipantInput[] | null {
  if (!Array.isArray(input)) return null;
  const out: ParticipantInput[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const entry: ParticipantInput = {
      role: typeof p.role === 'string' && p.role ? p.role : 'participant',
      is_pm: p.is_pm === true,
    };
    if (typeof p.user_id === 'string' && p.user_id) {
      entry.user_id = p.user_id;
    } else if (typeof p.partner_worker_id === 'number') {
      entry.partner_worker_id = p.partner_worker_id;
    } else if (typeof p.partner_company_id === 'number') {
      entry.partner_company_id = p.partner_company_id;
    } else {
      continue; // 식별자 없는 항목은 버림
    }
    out.push(entry);
  }
  return out;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const supabase = await createSupabaseServerClient();
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id,bu_code,pm_id,created_by,participants')
    .eq('id', id)
    .eq('bu_code', ADMIN_BU)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  if (
    !canEditProject(user, {
      pm_id: (project as any).pm_id ?? null,
      created_by: (project as any).created_by ?? null,
      participants: (project as any).participants,
    })
  ) {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name 비어있음' }, { status: 400 });
    }
    patch.name = body.name.trim();
  }
  if ('description' in body) {
    patch.description =
      typeof body.description === 'string' ? body.description : body.description ?? null;
  }
  if ('status' in body) {
    if (!ALLOWED_PROJECT_STATUSES.includes(body.status as any)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if ('end_date' in body) {
    patch.end_date = typeof body.end_date === 'string' && body.end_date ? body.end_date : null;
  }
  if ('start_date' in body) {
    patch.start_date = typeof body.start_date === 'string' && body.start_date ? body.start_date : null;
  }
  if ('pm_id' in body) {
    patch.pm_id = typeof body.pm_id === 'string' && body.pm_id ? body.pm_id : null;
  }
  if ('partner_id' in body) {
    if (body.partner_id === null || body.partner_id === '' || body.partner_id === undefined) {
      patch.partner_id = null;
    } else {
      const pid = Number(body.partner_id);
      if (!Number.isFinite(pid)) {
        return NextResponse.json({ error: 'invalid partner_id' }, { status: 400 });
      }
      patch.partner_id = pid;
    }
  }
  if ('participants' in body) {
    const parts = normalizeParticipants(body.participants);
    if (parts === null) {
      return NextResponse.json({ error: 'invalid participants' }, { status: 400 });
    }
    patch.participants = parts;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경 사항이 없습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .eq('bu_code', ADMIN_BU)
    .select('id,name,description,status,start_date,end_date,pm_id,partner_id,participants')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id,bu_code,pm_id,created_by,participants')
    .eq('id', id)
    .eq('bu_code', ADMIN_BU)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  if (
    !canDeleteProject(user, {
      pm_id: (project as any).pm_id ?? null,
      created_by: (project as any).created_by ?? null,
      participants: (project as any).participants,
    })
  ) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  // 연결된 task 들 먼저 정리 (FK가 cascade가 아닐 수 있으므로 명시 삭제)
  const { error: tErr } = await supabase
    .from('project_tasks')
    .delete()
    .eq('project_id', id)
    .eq('bu_code', ADMIN_BU);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('bu_code', ADMIN_BU);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
