import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { PortfolioItem } from '@/types';
import { CURRENT_BU_CODE } from '@/types';
import FeaturedWorkClient from './FeaturedWorkClient';

async function getFeaturedItems(): Promise<PortfolioItem[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('bu_code', CURRENT_BU_CODE)
      .eq('is_visible', true)
      .order('display_order', { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function FeaturedWork() {
  const items = await getFeaturedItems();

  if (items.length === 0) return null;

  return <FeaturedWorkClient items={items} />;
}
