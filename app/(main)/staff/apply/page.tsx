import type { Metadata } from 'next';
import Image from 'next/image';
import StaffApplyForm from '@/components/sections/staff/StaffApplyForm';

export const metadata: Metadata = {
  title: 'REACT 제작 파트너 지원',
  description:
    'REACT Studio와 함께할 제작사, 팀, 개인 스탭을 모집합니다. 가능한 업무, 경력, 장비, 툴, 금액 기준을 남겨 주세요.',
  alternates: { canonical: '/staff/apply' },
  openGraph: {
    title: 'REACT 제작 파트너 지원',
    description: '영상 제작 파트너 지원서. 가능한 업무, 경력, 장비, 툴, 금액 기준을 남겨 주세요.',
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
              <p className="text-sm font-semibold text-brand">제작 파트너 지원</p>
              <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-normal text-white sm:text-6xl">
                REACT와 함께할 제작 파트너를 모집합니다.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55">
                제작사, 팀, 개인 모두 지원할 수 있습니다.
                <br />
                가능한 업무, 경력, 장비, 툴, 대략적인 금액 기준을 남겨주시면 프로젝트별로 검토하겠습니다.
              </p>
            </div>

            <div className="rounded-md border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm font-bold text-white">지원 전에 준비해 주세요.</p>
              <div className="mt-4 space-y-2 text-sm leading-relaxed text-white/50">
                <p>연락 가능한 정보와 활동 지역</p>
                <p>가능한 업무와 최근 작업 링크</p>
                <p>사용하는 장비, 툴, 대략적인 금액 기준</p>
              </div>
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
