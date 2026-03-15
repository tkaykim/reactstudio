import type { Metadata } from 'next';
import { Camera, Zap, Heart, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: '어바웃',
  description: 'React Studio 스튜디오 소개, 철학, 가치',
};

const values = [
  {
    icon: Camera,
    title: '퀄리티 퍼스트',
    desc: '타협 없는 화질, 색보정, 사운드. 모든 프레임에 최선을 다합니다.',
  },
  {
    icon: Zap,
    title: '납기 준수',
    desc: '약속한 일정은 반드시 지킵니다. 100% 납기 준수 기록을 자랑합니다.',
  },
  {
    icon: Heart,
    title: '클라이언트 중심',
    desc: '아티스트와 브랜드의 비전을 최우선으로. 끝없는 소통과 수정을 지원합니다.',
  },
  {
    icon: Award,
    title: '크리에이티브 탁월함',
    desc: '트렌드를 앞서가는 창의적 기획과 연출로 차별화된 콘텐츠를 만듭니다.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center mb-20">
          <span className="text-brand text-sm font-semibold uppercase tracking-widest">About</span>
          <h1 className="text-4xl sm:text-6xl font-black text-white mt-3 mb-6">
            우리는 React Studio입니다
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            2015년부터 수많은 아티스트, 브랜드와 함께해온 영상제작 프로덕션.
            <br />
            뮤직비디오, 댄스비디오/퍼포먼스, 라이브 클립, 웹예능, 광고까지 —
            <br />
            창의적인 영상으로 당신의 이야기를 세상에 전합니다.
          </p>
        </div>

        {/* Philosophy */}
        <div className="mb-20">
          <div className="relative p-10 rounded-2xl bg-gradient-to-br from-brand/10 to-transparent border border-brand/20 text-center">
            <blockquote className="text-2xl sm:text-3xl font-black text-white leading-tight">
              &ldquo;모든 영상은 하나의 예술 작품입니다.
              <br />
              <span className="text-brand">우리는 당신의 이야기를 아름답게 담습니다.</span>&rdquo;
            </blockquote>
            <cite className="mt-6 block text-white/40 text-sm not-italic">— React Studio</cite>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-2xl font-black text-white mb-8 text-center">우리의 가치</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                  <v.icon size={22} className="text-brand" />
                </div>
                <h3 className="text-white font-bold mb-2">{v.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.03] border border-white/10">
            <span className="text-brand text-3xl font-black">10+</span>
            <span className="text-white/60 text-sm text-left leading-tight">
              년 이상의 영상제작 경력
              <br />
              <span className="text-white/40 text-xs">Since 2015</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
