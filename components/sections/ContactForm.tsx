'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Loader2, Plus, X, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BUDGET_RANGES, PROJECT_SCALES } from '@/types';

const serviceOptions = [
  '뮤직비디오',
  '댄스비디오/퍼포먼스',
  '라이브 클립',
  '웹예능',
  '숏폼',
  '홍보영상',
  '브랜드필름',
  '기타',
];

interface FormData {
  services: string[];
  project_title: string;
  project_scale: string;
  deadline: string;
  budget_range: string;
  description: string;
  reference_urls: string[];
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
}

const initialForm: FormData = {
  services: [],
  project_title: '',
  project_scale: '',
  deadline: '',
  budget_range: '',
  description: '',
  reference_urls: [],
  name: '',
  company: '',
  email: '',
  phone: '',
  message: '',
};

const STEPS = ['서비스 선택', '프로젝트 상세', '연락처'];

interface ReferenceVideo {
  videoId: string;
  title: string;
  category: string;
  thumbnailUrl: string;
}

export default function ContactForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [refVideo, setRefVideo] = useState<ReferenceVideo | null>(null);

  useEffect(() => {
    const videoId = searchParams.get('ref_video');
    const title = searchParams.get('ref_title');
    const category = searchParams.get('ref_category');
    if (!videoId || !title) return;

    const ref: ReferenceVideo = {
      videoId,
      title,
      category: category || '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };
    setRefVideo(ref);

    const youtubeUrl = `https://youtu.be/${videoId}`;
    setForm((f) => ({
      ...f,
      services: category && serviceOptions.includes(category) && !f.services.includes(category)
        ? [...f.services, category]
        : f.services,
      reference_urls: f.reference_urls.includes(youtubeUrl) ? f.reference_urls : [youtubeUrl, ...f.reference_urls],
    }));
  }, [searchParams]);

  const toggleService = (svc: string) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(svc)
        ? f.services.filter((s) => s !== svc)
        : [...f.services, svc],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
        className="text-center py-16"
      >
        <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-brand" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">문의가 접수되었습니다!</h3>
        <p className="text-white/50">
          빠른 시일 내에 담당자가 연락드리겠습니다.
          <br />
          평균 영업일 1~2일 내에 회신드립니다.
        </p>
      </motion.div>
    );
  }

  const removeRefVideo = () => {
    if (!refVideo) return;
    const youtubeUrl = `https://youtu.be/${refVideo.videoId}`;
    setForm((f) => ({
      ...f,
      reference_urls: f.reference_urls.filter((u) => u !== youtubeUrl),
    }));
    setRefVideo(null);
  };

  return (
    <div>
      {/* Reference video card */}
      {refVideo && (
        <div className="mb-8 p-4 rounded-sm border border-brand/30 bg-brand/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-brand text-xs font-semibold tracking-wide uppercase">
              레퍼런스 영상
            </span>
            <button
              onClick={removeRefVideo}
              className="text-white/30 hover:text-white/60 transition-colors"
              aria-label="레퍼런스 제거"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-24 aspect-video rounded-sm overflow-hidden bg-white/5 shrink-0">
              <Image
                src={refVideo.thumbnailUrl}
                alt={refVideo.title}
                fill
                className="object-cover"
                sizes="96px"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play size={14} className="text-white/80" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium line-clamp-1">{refVideo.title}</p>
              {refVideo.category && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-sm text-xs bg-white/[0.06] text-white/50 border border-white/10">
                  {refVideo.category}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step
                  ? 'bg-brand text-white'
                  : i === step
                  ? 'bg-brand text-white ring-4 ring-brand/20'
                  : 'bg-white/10 text-white/30'
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i === step ? 'text-white font-medium' : 'text-white/30'}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px w-8 sm:w-16 ${i < step ? 'bg-brand' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Service selection */}
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-xl font-bold text-white mb-2">어떤 영상이 필요하신가요?</h3>
            <p className="text-white/50 text-sm mb-6">복수 선택 가능합니다.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {serviceOptions.map((svc) => {
                const selected = form.services.includes(svc);
                return (
                  <button
                    key={svc}
                    onClick={() => toggleService(svc)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selected
                        ? 'border-brand bg-brand/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/30'
                    }`}
                  >
                    <span className="font-medium text-sm">{svc}</span>
                    {selected && <Check size={14} className="text-brand mt-1" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 2: Project details */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <h3 className="text-xl font-bold text-white mb-6">프로젝트 상세 정보</h3>

            <div>
              <Label className="text-white/70 mb-2 block">프로젝트 제목 *</Label>
              <Input
                placeholder="예: OOO 뮤직비디오 제작, OOO 브랜드 광고 촬영"
                value={form.project_title}
                onChange={(e) => setForm((f) => ({ ...f, project_title: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div>
              <Label className="text-white/70 mb-2 block">프로젝트 규모</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PROJECT_SCALES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, project_scale: s.value }))}
                    className={`text-left p-4 rounded border transition-all ${
                      form.project_scale === s.value
                        ? 'border-brand bg-brand/10 text-white'
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    <span className="block font-medium text-sm">{s.value}</span>
                    <span className="block text-xs mt-1 opacity-80">{s.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white/70 mb-2 block">희망 납기일</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-white/70 mb-2 block">예산 범위</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BUDGET_RANGES.map((b) => (
                  <button
                    key={b}
                    onClick={() => setForm((f) => ({ ...f, budget_range: b }))}
                    className={`py-2.5 px-3 rounded border text-sm transition-all ${
                      form.budget_range === b
                        ? 'border-brand bg-brand/10 text-white'
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white/70 mb-2 block">프로젝트 상세 설명</Label>
              <Textarea
                placeholder="원하시는 영상의 컨셉, 분위기, 참고 사항 등을 자유롭게 작성해 주세요."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              />
            </div>

            <div>
              <Label className="text-white/70 mb-2 block">레퍼런스 URL (선택)</Label>
              <p className="text-white/30 text-xs mb-3">참고할 영상이나 사이트 주소를 입력해 주세요.</p>
              <div className="space-y-2">
                {form.reference_urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={url}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          reference_urls: f.reference_urls.map((u, idx) => (idx === i ? e.target.value : u)),
                        }))
                      }
                      placeholder="https://"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          reference_urls: f.reference_urls.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="p-2 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, reference_urls: [...f.reference_urls, ''] }))}
                  className="flex items-center gap-2 text-brand text-sm hover:text-orange-400 transition-colors py-1"
                >
                  <Plus size={14} /> 레퍼런스 추가
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Contact */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold text-white mb-6">연락처 정보</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70 mb-2 block">이름 *</Label>
                <Input
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">회사명</Label>
                <Input
                  placeholder="소속 또는 아티스트명"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">이메일 *</Label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">전화번호 *</Label>
                <Input
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div>
              <Label className="text-white/70 mb-2 block">메시지</Label>
              <Textarea
                placeholder="프로젝트에 대해 자유롭게 말씀해 주세요."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={4}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
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
            disabled={step === 0 && form.services.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-semibold rounded hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            다음 <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.name || !form.email || !form.phone}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-semibold rounded hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
