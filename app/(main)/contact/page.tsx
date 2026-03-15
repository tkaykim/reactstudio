import type { Metadata } from 'next';
import ContactForm from '@/components/sections/ContactForm';
import { Mail, Phone, Instagram, Youtube } from 'lucide-react';

export const metadata: Metadata = {
  title: '문의/견적',
  description: '프로젝트 문의 및 견적 신청 — React Studio',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Left: Info */}
          <div className="lg:col-span-2">
            <span className="text-brand text-sm font-semibold uppercase tracking-widest">Contact</span>
            <h1 className="text-4xl font-black text-white mt-3 mb-4">프로젝트 문의</h1>
            <p className="text-white/50 leading-relaxed mb-8">
              새 프로젝트가 있으신가요? 아이디어만 있어도 충분합니다.
              <br />
              무료 상담을 통해 최적의 솔루션을 제안해드립니다.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-white/50">
                <Mail size={18} className="text-brand flex-shrink-0" />
                <span>react.studio.kr@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 text-white/50">
                <Phone size={18} className="text-brand flex-shrink-0" />
                <span>010-2087-0621</span>
              </div>
              <div className="flex items-center gap-3 text-white/50">
                <Instagram size={18} className="text-brand flex-shrink-0" />
                <span>@reactstudio_kr</span>
              </div>
              <div className="flex items-center gap-3 text-white/50">
                <Youtube size={18} className="text-brand flex-shrink-0" />
                <span>React Studio</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-brand/5 border border-brand/20">
              <p className="text-white/70 text-sm leading-relaxed">
                <span className="text-brand font-semibold">평균 응답 시간:</span>
                <br />
                영업일 기준 1~2일 이내에 담당자가 연락드립니다.
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/10">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
