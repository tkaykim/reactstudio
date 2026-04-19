import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import StartWizard from '@/components/sections/StartWizard';
import type { PortfolioItem } from '@/types';
import { CURRENT_BU_CODE } from '@/types';

export const metadata: Metadata = {
  title: '프로젝트 시작하기 — 맞춤 영상제작 상담',
  description:
    '뮤직비디오, 댄스비디오, 웹예능 등 영상 제작 프로젝트를 시작하세요. 예산에 맞춘 유연한 제작, 맞춤 상담부터 포트폴리오 매칭까지 — React Studio',
  alternates: { canonical: '/start' },
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

export default async function StartPage() {
  const portfolioItems = await getPortfolioItems();

  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-brand text-sm font-semibold uppercase tracking-widest">
            Start Your Project
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">
            프로젝트 시작하기
          </h1>
          <p className="text-white/40 max-w-lg mx-auto text-sm leading-relaxed">
            몇 가지 질문에 답변해 주시면 최적의 제작 방안을 제안드리겠습니다.
            <br />
            소요 시간: 약 2~3분
          </p>
        </div>

        <StartWizard portfolioItems={portfolioItems} />
      </div>
    </div>
  );
}
