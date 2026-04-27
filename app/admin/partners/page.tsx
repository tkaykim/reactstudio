import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import PartnersClient, { type PartnerRow, type CompanyOption } from './PartnersClient';

export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: partnerData, error } = await supabase
    .from('partners')
    .select(
      'id,display_name,name_ko,name_en,entity_type,phone,email,website_url,is_active,owner_bu_code,created_at'
    )
    .eq('owner_bu_code', ADMIN_BU)
    .order('display_name');
  if (error) console.error('[admin/partners] fetch', error);

  const all = (partnerData ?? []) as Array<{
    id: number;
    display_name: string;
    name_ko: string | null;
    name_en: string | null;
    entity_type: string;
    phone: string | null;
    email: string | null;
    website_url: string | null;
    is_active: boolean;
  }>;

  const personIds = all.filter((p) => p.entity_type === 'person').map((p) => p.id);
  const companyIds = all.filter((p) => p.entity_type !== 'person').map((p) => p.id);

  // active employee relations 만 가져와 person → parent 매핑 / company → child count 매핑
  let parentMap = new Map<number, number>(); // child_id → parent_id
  let childCountMap = new Map<number, number>(); // parent_id → count

  if (personIds.length || companyIds.length) {
    const { data: relData } = await supabase
      .from('partner_relations')
      .select('parent_partner_id,child_partner_id,relation_type,is_active')
      .eq('relation_type', 'employee')
      .eq('is_active', true)
      .or(
        [
          personIds.length ? `child_partner_id.in.(${personIds.join(',')})` : '',
          companyIds.length ? `parent_partner_id.in.(${companyIds.join(',')})` : '',
        ]
          .filter(Boolean)
          .join(',')
      );

    for (const r of (relData ?? []) as Array<{
      parent_partner_id: number;
      child_partner_id: number;
    }>) {
      if (!parentMap.has(r.child_partner_id)) {
        parentMap.set(r.child_partner_id, r.parent_partner_id);
      }
      childCountMap.set(
        r.parent_partner_id,
        (childCountMap.get(r.parent_partner_id) ?? 0) + 1
      );
    }
  }

  const nameById = new Map<number, string>();
  for (const p of all) nameById.set(p.id, p.display_name);

  const rows: PartnerRow[] = all.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    name_ko: p.name_ko,
    name_en: p.name_en,
    entity_type: p.entity_type === 'person' ? 'person' : 'organization',
    phone: p.phone,
    email: p.email,
    website_url: p.website_url,
    is_active: p.is_active,
    parent_partner_id:
      p.entity_type === 'person' ? parentMap.get(p.id) ?? null : null,
    parent_name:
      p.entity_type === 'person'
        ? (parentMap.get(p.id) != null ? nameById.get(parentMap.get(p.id)!) ?? null : null)
        : null,
    member_count: p.entity_type !== 'person' ? childCountMap.get(p.id) ?? 0 : 0,
  }));

  const companies: CompanyOption[] = all
    .filter((p) => p.entity_type !== 'person')
    .map((p) => ({ id: p.id, name: p.display_name }));

  return <PartnersClient initialRows={rows} companies={companies} />;
}
