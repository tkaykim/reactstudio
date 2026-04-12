'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import type { PortfolioItem, StartFormData } from '@/types';
import ContentTypeStep from './start/ContentTypeStep';
import ServiceDetailStep from './start/ServiceDetailStep';
import PortfolioShowcaseStep from './start/PortfolioShowcaseStep';
import ProjectDetailStep from './start/ProjectDetailStep';
import BudgetScheduleStep from './start/BudgetScheduleStep';
import MeetingStep from './start/MeetingStep';
import ContactSummaryStep from './start/ContactSummaryStep';

const STEPS = [
  { key: 'content_type', label: '콘텐츠 유형' },
  { key: 'service', label: '세부 서비스' },
  { key: 'portfolio', label: '포트폴리오' },
  { key: 'project', label: '프로젝트 상세' },
  { key: 'budget', label: '예산 & 일정' },
  { key: 'meeting', label: '미팅 & 상담' },
  { key: 'contact', label: '연락처 확인' },
];

const initialForm: StartFormData = {
  content_types: [],
  services: [],
  custom_service: '',
  video_count: '',
  project_scale: '',
  description: '',
  reference_urls: [],
  budget_range: '',
  deadline: '',
  deadline_flexible: false,
  meeting_preference: '',
  preferred_date: '',
  preferred_time_slot: '',
  additional_request: '',
  name: '',
  company: '',
  email: '',
  phone: '',
};

interface StartWizardProps {
  portfolioItems: PortfolioItem[];
}

export default function StartWizard({ portfolioItems }: StartWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<StartFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const updateForm = useCallback((patch: Partial<StartFormData>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const goToStep = useCallback((s: number) => {
    setStep(s);
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return form.content_types.length > 0;
      case 1:
        return form.services.length > 0;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return !!form.name && !!form.email && !!form.phone;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        services: form.services,
        project_title: form.services.join(', '),
        project_scale: form.project_scale,
        deadline: form.deadline_flexible ? '일정 협의' : form.deadline,
        budget_range: form.budget_range,
        description: form.description,
        reference_urls: form.reference_urls.filter((u) => u.trim()),
        message: '',
        content_types: form.content_types,
        video_count: form.video_count,
        meeting_preference: form.meeting_preference,
        preferred_date: form.preferred_date,
        preferred_time_slot: form.preferred_time_slot,
        additional_request: form.additional_request,
        custom_service: form.custom_service,
        source: 'start_wizard',
      };

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('제출에 실패했습니다.');
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20"
      >
        <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-brand" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3">문의가 접수되었습니다!</h2>
        <p className="text-white/50 max-w-md mx-auto leading-relaxed">
          담당 프로듀서가 확인 후 빠르게 연락드리겠습니다.
          <br />
          평균 영업일 1~2일 내에 회신드립니다.
        </p>
        <a
          href="/portfolio"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-white/5 border border-white/10 text-white text-sm rounded-lg hover:bg-white/10 transition-colors"
        >
          포트폴리오 둘러보기 <ChevronRight size={16} />
        </a>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/40 text-xs font-medium">
            {step + 1} / {STEPS.length}
          </span>
          <span className="text-white/40 text-xs">{STEPS[step].label}</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand rounded-full"
            initial={false}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => i < step && setStep(i)}
              disabled={i >= step}
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                i < step
                  ? 'bg-brand text-white cursor-pointer hover:ring-2 ring-brand/30'
                  : i === step
                    ? 'bg-brand text-white ring-4 ring-brand/20'
                    : 'bg-white/10 text-white/20'
              }`}
            >
              {i < step ? <Check size={12} /> : i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 0 && <ContentTypeStep form={form} onUpdate={updateForm} />}
        {step === 1 && <ServiceDetailStep form={form} onUpdate={updateForm} />}
        {step === 2 && <PortfolioShowcaseStep form={form} portfolioItems={portfolioItems} />}
        {step === 3 && <ProjectDetailStep form={form} onUpdate={updateForm} />}
        {step === 4 && <BudgetScheduleStep form={form} onUpdate={updateForm} />}
        {step === 5 && <MeetingStep form={form} onUpdate={updateForm} />}
        {step === 6 && <ContactSummaryStep form={form} onUpdate={updateForm} onGoToStep={goToStep} />}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm mt-4">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white disabled:opacity-0 transition-colors"
        >
          <ChevronLeft size={18} /> 이전
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {step === 2 ? '다음 단계로' : '다음'} <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> 제출 중...
              </>
            ) : (
              <>제출하기 <Check size={18} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
