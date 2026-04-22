import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireAdmin, canViewAll } from '@/lib/admin-auth';
import InquiriesClient from './InquiriesClient';

export default async function InquiriesPage() {
  const user = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  let q = supabase.from('inquiries').select('*').order('created_at', { ascending: false });
  if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
  const { data } = await q;
  return <InquiriesClient initialInquiries={data ?? []} />;
}
