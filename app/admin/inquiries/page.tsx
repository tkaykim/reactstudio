import { createSupabaseServerClient } from '@/lib/supabase-server';
import { CURRENT_BU_CODE } from '@/types';
import InquiriesClient from './InquiriesClient';

async function getInquiries() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .eq('bu_code', CURRENT_BU_CODE)
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function InquiriesPage() {
  const inquiries = await getInquiries();
  return <InquiriesClient initialInquiries={inquiries} />;
}
