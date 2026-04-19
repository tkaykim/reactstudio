import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import PortfolioGrid from '@/components/sections/PortfolioGrid';
import type { PortfolioItem } from '@/types';
import { CURRENT_BU_CODE } from '@/types';

export const metadata: Metadata = {
  title: '포트폴리오 — 뮤직비디오·댄스비디오·퍼포먼스 영상 작업물',
  description:
    'React Studio가 제작한 뮤직비디오, 댄스비디오, 퍼포먼스 영상, 라이브 클립, 웹예능 콘텐츠를 확인하세요. K-pop 아티스트와 함께한 다양한 영상 포트폴리오.',
  alternates: { canonical: '/portfolio' },
};

export const revalidate = 3600;

async function getPortfolioItems(): Promise<PortfolioItem[]> {
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

export default async function PortfolioPage() {
  const items = await getPortfolioItems();

  return (
    <div className="min-h-screen bg-black pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            All Works
          </h1>
          <p className="text-white/30 text-sm mt-3">
            React Studio의 영상 작업물을 확인해보세요
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-32 text-white/20">
            <p className="text-lg">Coming Soon</p>
          </div>
        ) : (
          <Suspense>
            <PortfolioGrid items={items} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
