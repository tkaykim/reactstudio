import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import InquiriesClient from './InquiriesClient';

export default async function InquiriesPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('inquiries')
    .select('*')
    .eq('bu_code', ADMIN_BU)
    .order('created_at', { ascending: false });
  return <InquiriesClient initialInquiries={data ?? []} />;
}
