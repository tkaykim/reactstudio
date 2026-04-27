import { NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const ALLOWED_ENTITY = ['person', 'organization'] as const;

export async function POST(req: Request) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const body = await req.json().catch(() => ({} as any));

  const display_name = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  if (!display_name) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  }
  const entity_type = body.entity_type;
  if (!ALLOWED_ENTITY.includes(entity_type)) {
    return NextResponse.json({ error: 'entity_type 은 person 또는 organization 만 가능합니다.' }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    display_name,
    entity_type,
    name_ko: typeof body.name_ko === 'string' && body.name_ko ? body.name_ko : null,
    name_en: typeof body.name_en === 'string' && body.name_en ? body.name_en : null,
    phone: typeof body.phone === 'string' && body.phone ? body.phone : null,
    email: typeof body.email === 'string' && body.email ? body.email : null,
    website_url: typeof body.website_url === 'string' && body.website_url ? body.website_url : null,
    is_active: body.is_active === false ? false : true,
    owner_bu_code: ADMIN_BU,
    security_level: 'internal',
    sharing_policy: 'bu_shared',
    created_by: user.id,
  };

  const supabase = await createSupabaseServerClient();
  const { data: created, error } = await supabase
    .from('partners')
    .insert(insert)
    .select('id,display_name,name_ko,name_en,entity_type,phone,email,website_url,is_active,owner_bu_code')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // person + parent_partner_id 가 있으면 partner_relations insert
  if (entity_type === 'person' && body.parent_partner_id != null && body.parent_partner_id !== '') {
    const parentId = Number(body.parent_partner_id);
    if (Number.isFinite(parentId)) {
      const { data: parent, error: pErr } = await supabase
        .from('partners')
        .select('id,owner_bu_code,entity_type')
        .eq('id', parentId)
        .maybeSingle();
      if (!pErr && parent && (parent as any).owner_bu_code === ADMIN_BU) {
        await supabase.from('partner_relations').insert({
          parent_partner_id: parentId,
          child_partner_id: created.id,
          relation_type: 'employee',
          is_active: true,
        });
      }
    }
  }

  return NextResponse.json(created);
}
