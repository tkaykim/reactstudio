import { requireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import type {
  StaffApplicationRow,
  StaffCapabilityRow,
  StaffFileRow,
  StaffNoteRow,
  StaffRateCardRow,
  StaffSkillEntryRow,
} from '@/lib/staff-pool';
import StaffPoolClient from './StaffPoolClient';

export const dynamic = 'force-dynamic';

type StaffApplicationBaseRow = Omit<
  StaffApplicationRow,
  'capabilities' | 'skill_entries' | 'rate_cards' | 'files' | 'notes' | 'partner_name'
>;

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export default async function StaffPoolPage() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  const { data: applicationData, error } = await supabase
    .from('react_staff_applications')
    .select('*')
    .eq('bu_code', ADMIN_BU)
    .order('created_at', { ascending: false });

  if (error) console.error('[admin/staff-pool] applications', error);

  const applications = (applicationData ?? []) as StaffApplicationBaseRow[];
  const ids = applications.map((item) => item.id);
  const partnerIds = applications
    .map((item) => item.partner_id)
    .filter((id): id is number => typeof id === 'number');

  const [capabilitiesRes, skillsRes, ratesRes, filesRes, notesRes, partnersRes] =
    ids.length > 0
      ? await Promise.all([
          supabase.from('react_staff_capabilities').select('*').in('application_id', ids),
          supabase.from('react_staff_skill_entries').select('*').in('application_id', ids),
          supabase.from('react_staff_rate_cards').select('*').in('application_id', ids),
          supabase.from('react_staff_files').select('*').in('application_id', ids),
          supabase
            .from('react_staff_notes')
            .select('*,author:app_users!react_staff_notes_created_by_fkey(name)')
            .in('application_id', ids)
            .order('created_at', { ascending: false }),
          partnerIds.length
            ? supabase.from('partners').select('id,display_name').in('id', partnerIds)
            : Promise.resolve({ data: [] }),
        ])
      : [
          { data: [] },
          { data: [] },
          { data: [] },
          { data: [] },
          { data: [] },
          { data: [] },
        ];

  const capsByApp = new Map<number, StaffCapabilityRow[]>();
  for (const cap of (capabilitiesRes.data ?? []) as StaffCapabilityRow[]) {
    capsByApp.set(cap.application_id, [...(capsByApp.get(cap.application_id) ?? []), cap]);
  }

  const skillsByApp = new Map<number, StaffSkillEntryRow[]>();
  for (const skill of (skillsRes.data ?? []) as StaffSkillEntryRow[]) {
    skillsByApp.set(skill.application_id, [...(skillsByApp.get(skill.application_id) ?? []), skill]);
  }

  const ratesByApp = new Map<number, StaffRateCardRow[]>();
  for (const rate of (ratesRes.data ?? []) as StaffRateCardRow[]) {
    ratesByApp.set(rate.application_id, [...(ratesByApp.get(rate.application_id) ?? []), rate]);
  }

  const filesByApp = new Map<number, StaffFileRow[]>();
  for (const file of (filesRes.data ?? []) as StaffFileRow[]) {
    filesByApp.set(file.application_id, [...(filesByApp.get(file.application_id) ?? []), file]);
  }

  const notesByApp = new Map<number, StaffNoteRow[]>();
  for (const note of (notesRes.data ?? []) as Array<StaffNoteRow & { author?: { name: string | null } | null }>) {
    const row = { ...note, author_name: note.author?.name ?? null };
    notesByApp.set(note.application_id, [...(notesByApp.get(note.application_id) ?? []), row]);
  }

  const partnerNameById = new Map<number, string>();
  for (const partner of (partnersRes.data ?? []) as Array<{ id: number; display_name: string }>) {
    partnerNameById.set(partner.id, partner.display_name);
  }

  const rows: StaffApplicationRow[] = applications.map((item) => ({
    ...item,
    social_links: asArray(item.social_links),
    portfolio_urls: asArray(item.portfolio_urls),
    preferred_project_types: asArray(item.preferred_project_types),
    equipment: asArray(item.equipment),
    tools: asArray(item.tools),
    ai_tools: asArray(item.ai_tools),
    capabilities: capsByApp.get(item.id) ?? [],
    skill_entries: skillsByApp.get(item.id) ?? [],
    rate_cards: ratesByApp.get(item.id) ?? [],
    files: filesByApp.get(item.id) ?? [],
    notes: notesByApp.get(item.id) ?? [],
    partner_name: item.partner_id ? partnerNameById.get(item.partner_id) ?? null : null,
  })) as StaffApplicationRow[];

  return <StaffPoolClient initialRows={rows} />;
}
