import type { Metadata } from 'next';
import Link from 'next/link';
import { Music, Users, Star, Tv, ShoppingBag, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: '서비스',
  description: '뮤직비디오, 댄스비디오/퍼포먼스, 라이브 클립, 웹예능, 광고·커머스 영상제작 서비스',
};

const services = [
  {
    icon: Music,
    title: '뮤직비디오',
    subtitle: 'Music Video',
    description:
      '아티스트의 음악을 시각적 언어로 재해석합니다. 스토리보드 기획부터 세트 구성, 촬영, 후반 작업까지 모든 과정을 한 팀이 담당합니다.',
    features: [
      '콘셉트 기획 및 스토리보드',
      '세트·로케이션 섭외',
      '4K 촬영 및 조명',
      '색보정(컬러그레이딩)',
      'VFX/모션그래픽',
      '납품 포맷 최적화',
    ],
    process: ['기획/미팅', '프리프로덕션', '촬영', '편집/VFX', '색보정', '납품'],
  },
  {
    icon: Users,
    title: '댄스비디오/퍼포먼스',
    subtitle: 'Dance / Performance Video',
    description:
      '댄서의 무브먼트를 가장 아름답고 역동적으로 포착합니다. 다각도 멀티캠 셋업으로 어떤 동작도 놓치지 않습니다.',
    features: [
      '멀티캠 촬영',
      '슬로우모션(120fps+)',
      '다이나믹한 카메라워크',
      '드론 항공 촬영',
      '안무 싱크 편집',
      '음악 믹싱 최적화',
    ],
    process: ['상담/기획', '장소 섭외', '촬영', '편집', '납품'],
  },
  {
    icon: Star,
    title: '라이브 클립',
    subtitle: 'Live Clip',
    description:
      '무대 위의 에너지를 스크린으로 옮깁니다. 라이브 공연 다큐, 스튜디오 퍼포먼스, 쇼케이스까지 모든 형태의 라이브를 촬영합니다.',
    features: [
      '라이브 공연 촬영',
      '스튜디오 라이브',
      '멀티앵글 동시 촬영',
      '사운드 레코딩',
      '하이라이트 편집',
      '풀버전 + 클립 납품',
    ],
    process: ['상담', '사전 답사', '촬영 당일', '편집', '납품'],
  },
  {
    icon: Tv,
    title: '웹예능',
    subtitle: 'Web Entertainment',
    description:
      '시청자를 사로잡는 숏폼·롱폼 웹 예능 콘텐츠를 기획하고 제작합니다. 유튜브, 틱톡 등 플랫폼에 최적화된 콘텐츠를 제공합니다.',
    features: [
      '콘텐츠 기획·구성',
      '출연진 섭외 지원',
      '다중 카메라 촬영',
      '자막·그래픽 편집',
      '섬네일 제작',
      '플랫폼별 포맷 납품',
    ],
    process: ['기획/미팅', '대본 구성', '촬영', '편집/자막', '썸네일', '업로드 지원'],
  },
  {
    icon: ShoppingBag,
    title: '광고·커머스',
    subtitle: 'Commercial & Commerce',
    description:
      '제품의 매력을 극대화하는 상업 광고를 제작합니다. 브랜드 필름부터 SNS 바이럴 영상, 이커머스 상세페이지 영상까지.',
    features: [
      '브랜드 필름',
      '제품 상세 영상',
      'SNS 광고 소재',
      '바이럴 영상',
      '모델/제품 촬영',
      '광고 플랫폼 최적화',
    ],
    process: ['브리핑', '기획/콘셉트', '촬영', '편집', '검수/수정', '납품'],
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-brand text-sm font-semibold uppercase tracking-widest">Services</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">서비스</h1>
          <p className="text-white/50 max-w-xl mx-auto">
            5가지 전문 영역에서 최고의 결과물을 만들어드립니다
          </p>
        </div>

        {/* Service detail cards */}
        <div className="space-y-12">
          {services.map((svc, i) => (
            <div
              key={svc.title}
              className={`flex flex-col lg:flex-row gap-8 items-start ${
                i % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Left: Icon + title */}
              <div className="lg:w-72 flex-shrink-0">
                <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 text-center lg:text-left">
                  <div className="w-16 h-16 rounded-xl bg-brand/10 flex items-center justify-center mb-4 mx-auto lg:mx-0">
                    <svc.icon size={30} className="text-brand" />
                  </div>
                  <p className="text-brand text-xs font-semibold uppercase tracking-widest mb-1">
                    {svc.subtitle}
                  </p>
                  <h2 className="text-2xl font-black text-white">{svc.title}</h2>
                </div>
              </div>

              {/* Right: Details */}
              <div className="flex-1">
                <p className="text-white/60 leading-relaxed mb-6">{svc.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-3">포함 서비스</h3>
                    <ul className="space-y-2">
                      {svc.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-white/50 text-sm">
                          <ChevronRight size={14} className="text-brand flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold text-sm mb-3">제작 프로세스</h3>
                    <div className="flex flex-col gap-2">
                      {svc.process.map((step, si) => (
                        <div key={step} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand text-xs font-bold flex-shrink-0">
                            {si + 1}
                          </div>
                          <span className="text-white/60 text-sm">{step}</span>
                          {si < svc.process.length - 1 && (
                            <div className="w-px h-4 bg-white/10 ml-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/contact?service=${encodeURIComponent(svc.title)}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 transition-colors"
                >
                  {svc.title} 견적 문의
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
