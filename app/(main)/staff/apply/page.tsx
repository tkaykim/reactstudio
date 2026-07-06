import type { Metadata } from 'next';
import Image from 'next/image';
import StaffApplyForm from '@/components/sections/staff/StaffApplyForm';

export const metadata: Metadata = {
  title: 'REACT 스탭풀 지원',
  description:
    'REACT Studio와 함께할 제작사, 팀, 개인 스탭을 모집합니다. 기획, 촬영, 편집, 모션그래픽, 생성형 AI, 송출, 장비와 단가 정보를 접수합니다.',
  alternates: { canonical: '/staff/apply' },
  openGraph: {
    title: 'REACT 스탭풀 지원',
    description: '영상 제작 스탭풀 지원서. 세부 스킬, 경력, 장비, 툴, 단가 기준을 등록해 주세요.',
    images: ['/opengraph-image'],
  },
};

export default function StaffApplyPage() {
  return (
    <div className="min-h-screen bg-black pt-24 text-white">
      <section className="border-b border-white/10 pb-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-8 inline-flex rounded-md bg-white px-4 py-3">
                <Image
                  src="/brand/react-logo-black.png"
                  alt="REACT Studio"
                  width={210}
                  height={42}
                  priority
                  className="h-auto w-44 sm:w-52"
                />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                Staff Pool
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-normal text-white sm:text-6xl">
                REACT와 함께할 제작 파트너를 모집합니다.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55">
                제작사, 팀, 개인 모두 지원할 수 있습니다.
                <br />
                가능한 업무, 경력, 장비, 툴, 단가 기준을 남겨주시면 프로젝트별로 검토하겠습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/10 bg-white/10">
              {[
                ['Multiple', '중복 역량 허용'],
                ['Evidence', '대표작과 경력 확인'],
                ['Rates', '단가 기준 검색'],
                ['Private', '관리자 전용 열람'],
              ].map(([title, body]) => (
                <div key={title} className="bg-black p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{title}</p>
                  <p className="mt-2 text-sm text-white/55">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-[#080808] p-5 shadow-2xl shadow-black/40 sm:p-8">
            <StaffApplyForm />
          </div>
        </div>
      </section>
    </div>
  );
}
