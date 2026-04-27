import { NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

async function loadOwned(id: number) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('partners')
    .select('id,owner_bu_code,entity_type,is_active')
    .eq('id', id)
    .maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!data) return { error: NextResponse.json({ error: '파트너를 찾을 수 없습니다.' }, { status: 404 }) };
  if ((data as any).owner_bu_code !== ADMIN_BU) {
    return { error: NextResponse.json({ error: 'REACT 소유 파트너가 아닙니다.' }, { status: 403 }) };
  }
  return { supabase, partner: data };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const result = await loadOwned(id);
  if ('error' in result) return result.error;
  const { supabase, partner } = result;

  const body = await req.json().catch(() => ({} as any));
  const patch: Record<string, unknown> = {};

  if ('display_name' in body) {
    if (typeof body.display_name !== 'string' || !body.display_name.trim()) {
      return NextResponse.json({ error: 'display_name 비어있음' }, { status: 400 });
    }
    patch.display_name = body.display_name.trim();
  }
  for (const k of ['name_ko', 'name_en', 'phone', 'email', 'website_url'] as const) {
    if (k in body) {
      patch[k] = typeof body[k] === 'string' && body[k] ? body[k] : null;
    }
  }
  if ('is_active' in body) patch.is_active = body.is_active === true;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('partners')
      .update(patch)
      .eq('id', id)
      .eq('owner_bu_code', ADMIN_BU);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // parent_partner_id 변경 (person 만 의미)
  if ('parent_partner_id' in body && (partner as any).entity_type === 'person') {
    // 기존 active employee relation 비활성화
    await supabase
      .from('partner_relations')
      .update({ is_active: false })
      .eq('child_partner_id', id)
      .eq('relation_type', 'employee')
      .eq('is_active', true);

    if (body.parent_partner_id != null && body.parent_partner_id !== '') {
      const parentId = Number(body.parent_partner_id);
      if (Number.isFinite(parentId)) {
        const { data: parent } = await supabase
          .from('partners')
          .select('id,owner_bu_code')
          .eq('id', parentId)
          .maybeSingle();
        if (parent && (parent as any).owner_bu_code === ADMIN_BU) {
          await supabase.from('partner_relations').insert({
            parent_partner_id: parentId,
            child_partner_id: id,
            relation_type: 'employee',
            is_active: true,
          });
        }
      }
    }
  }

  const { data, error: rErr } = await supabase
    .from('partners')
    .select('id,display_name,name_ko,name_en,entity_type,phone,email,website_url,is_active,owner_bu_code')
    .eq('id', id)
    .single();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const result = await loadOwned(id);
  if ('error' in result) return result.error;
  const { supabase, partner } = result;

  // 사용 중 검사: projects.participants jsonb 안에 partner_company_id / partner_worker_id 사용?
  const fieldName =
    (partner as any).entity_type === 'person' ? 'partner_worker_id' : 'partner_company_id';
  const { count, error: cErr } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .contains('participants', [{ [fieldName]: id }]);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const url = new URL(req.url);
  const hard = url.searchParams.get('hard') === '1';

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `프로젝트 ${count}개에서 사용 중입니다. 비활성화만 가능합니다.`,
        used: true,
        count,
      },
      { status: 409 }
    );
  }

  if (hard) {
    // partner_relations 정리 (cascade 가 없을 수 있음)
    await supabase.from('partner_relations').delete().eq('parent_partner_id', id);
    await supabase.from('partner_relations').delete().eq('child_partner_id', id);
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id)
      .eq('owner_bu_code', ADMIN_BU);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, hard: true });
  }

  // soft delete: is_active=false
  const { error } = await supabase
    .from('partners')
    .update({ is_active: false })
    .eq('id', id)
    .eq('owner_bu_code', ADMIN_BU);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, hard: false });
}
