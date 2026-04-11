import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Client } from '@/types';
import { CURRENT_BU_CODE } from '@/types';
import ClientsMarqueeClient from './ClientsMarqueeClient';

async function getClients(): Promise<Client[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('bu_code', CURRENT_BU_CODE)
      .eq('is_visible', true)
      .order('display_order', { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ClientsMarquee() {
  const clients = await getClients();

  if (clients.length === 0) return null;

  return <ClientsMarqueeClient clients={clients} />;
}
