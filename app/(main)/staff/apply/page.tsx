import type { Metadata } from 'next';
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

type StaffApplyPageProps = {
  searchParams?: Promise<{
    availability_token?: string;
  }>;
};

export default async function StaffApplyPage({ searchParams }: StaffApplyPageProps) {
  const params = await searchParams;
  const availabilityToken = params?.availability_token?.trim() || '';

  return (
    <div className="min-h-screen bg-black pt-16 text-white">
      <section className="border-b border-white/10 pb-10">
        <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6 sm:pt-10 lg:px-8">
          <div className="mb-5 sm:mb-8">
            <p className="text-xs font-semibold text-brand">제작 파트너 지원</p>
            <h1 className="mt-3 max-w-3xl text-[2rem] font-black leading-tight tracking-normal text-white sm:text-5xl">
              REACT 제작 파트너 모집
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55 sm:text-base">
              제작사, 팀, 개인 모두 지원할 수 있습니다.
              <br className="hidden sm:block" />
              가능한 업무, 경력, 장비, 툴, 대략적인 금액 기준을 편하게 남겨주세요.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/45">
              <span className="rounded border border-white/10 px-3 py-2">제작사·팀·개인</span>
              <span className="rounded border border-white/10 px-3 py-2">기획·촬영·편집</span>
              <span className="rounded border border-white/10 px-3 py-2">장비·금액 기준</span>
            </div>
          </div>

          <div className="-mx-4 border-y border-white/10 bg-[#080808] px-4 py-5 sm:mx-0 sm:rounded-md sm:border sm:p-6 lg:p-8">
            <StaffApplyForm availabilityToken={availabilityToken} />
          </div>
        </div>
      </section>
    </div>
  );
}
