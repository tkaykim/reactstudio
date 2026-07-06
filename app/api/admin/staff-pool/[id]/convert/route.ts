import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';

type StaffApplicationForPartner = {
  id: number;
  applicant_type: 'company' | 'team' | 'individual';
  display_name: string;
  legal_name: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  partner_id: number | null;
};

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: applicationData, error: loadError } = await supabase
    .from('react_staff_applications')
    .select('id,applicant_type,display_name,legal_name,phone,email,website_url,partner_id')
    .eq('id', id)
    .eq('bu_code', ADMIN_BU)
    .single();

  if (loadError || !applicationData) {
    return NextResponse.json({ error: loadError?.message ?? '지원서를 찾을 수 없습니다.' }, { status: 404 });
  }

  const application = applicationData as StaffApplicationForPartner;

  if (application.partner_id) {
    return NextResponse.json({
      partner_id: application.partner_id,
      alreadyConverted: true,
    });
  }

  const entityType = application.applicant_type === 'individual' ? 'person' : 'organization';
  const { data: partner, error: insertError } = await supabase
    .from('partners')
    .insert({
      display_name: application.display_name,
      legal_name: application.legal_name,
      entity_type: entityType,
      name_ko: application.display_name,
      phone: application.phone,
      email: application.email,
      website_url: application.website_url,
      is_active: true,
      owner_bu_code: ADMIN_BU,
      security_level: 'internal',
      sharing_policy: 'bu_shared',
      created_by: user.id,
      metadata: {
        source: 'react_staff_pool',
        staff_application_id: id,
        applicant_type: application.applicant_type,
      },
    })
    .select('id,display_name')
    .single();

  if (insertError || !partner) {
    return NextResponse.json({ error: insertError?.message ?? '파트너 생성에 실패했습니다.' }, { status: 500 });
  }

  await supabase
    .from('react_staff_applications')
    .update({
      partner_id: partner.id,
      created_partner_at: new Date().toISOString(),
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('bu_code', ADMIN_BU);

  return NextResponse.json({ partner_id: partner.id, partner_name: partner.display_name });
}
