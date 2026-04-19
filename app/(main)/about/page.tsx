import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: '소개 — 소통으로 완성하는 영상 프로덕션',
  description:
    'React Studio는 뮤직비디오, 댄스비디오, 퍼포먼스 영상 전문 프로덕션입니다. 예산에 따라 유연하게 제작하며, 기획부터 납품까지 소통 중심의 제작 프로세스를 운영합니다.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center mb-16">
          <span className="text-brand text-sm font-semibold uppercase tracking-widest">About</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-6">
            React Studio
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            2015년부터. 뮤직비디오, 댄스/퍼포먼스, 라이브 클립, 웹예능, 광고.
          </p>
        </div>

        {/* Focus: 소통 */}
        <div className="mb-16">
          <div className="p-8 sm:p-10 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageCircle size={20} className="text-brand" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg mb-3">결국 가장 중요한건 소통</h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  예산부터 기획, 연출, 현장 소통까지 디테일한 요청사항들을 받아 만족도 높은 &apos;최적의&apos; 영상을 제공합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Experience */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/10">
            <span className="text-brand text-2xl font-black">10+</span>
            <span className="text-white/50 text-sm">
              년 영상제작 · Since 2015
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
