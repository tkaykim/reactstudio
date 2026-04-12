'use client';

import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StartFormData } from '@/types';
import { CONTENT_TYPES, MEETING_PREFERENCES } from '@/types';

interface ContactSummaryStepProps {
  form: StartFormData;
  onUpdate: (patch: Partial<StartFormData>) => void;
  onGoToStep: (step: number) => void;
}

function SummaryCard({
  label,
  value,
  stepIndex,
  onEdit,
}: {
  label: string;
  value: string;
  stepIndex: number;
  onEdit: (step: number) => void;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
      <div className="min-w-0">
        <p className="text-white/40 text-xs mb-0.5">{label}</p>
        <p className="text-white text-sm truncate">{value}</p>
      </div>
      <button
        onClick={() => onEdit(stepIndex)}
        className="ml-3 p-1.5 text-white/30 hover:text-brand transition-colors flex-shrink-0"
        aria-label={`${label} 수정`}
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

export default function ContactSummaryStep({ form, onUpdate, onGoToStep }: ContactSummaryStepProps) {
  const contentTypeLabels = form.content_types
    .map((ct) => CONTENT_TYPES.find((c) => c.value === ct)?.title)
    .filter(Boolean)
    .join(', ');

  const meetingLabel =
    MEETING_PREFERENCES.find((m) => m.value === form.meeting_preference)?.label ?? '';

  const scheduleLabel = [
    form.preferred_date,
    form.preferred_time_slot,
  ]
    .filter(Boolean)
    .join(' / ') || '';

  return (
    <motion.div
      key="contact-summary"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
          마지막으로, 연락처를 알려주세요
        </h2>
        <p className="text-white/50 text-sm">담당자가 빠르게 연락드리겠습니다.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-white/70 mb-2 block font-medium">이름 *</Label>
          <Input
            placeholder="홍길동"
            value={form.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div>
          <Label className="text-white/70 mb-2 block font-medium">회사 / 소속</Label>
          <Input
            placeholder="소속 또는 아티스트명"
            value={form.company}
            onChange={(e) => onUpdate({ company: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div>
          <Label className="text-white/70 mb-2 block font-medium">이메일 *</Label>
          <Input
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div>
          <Label className="text-white/70 mb-2 block font-medium">전화번호 *</Label>
          <Input
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold text-sm mb-3">선택 내용 요약</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <SummaryCard label="콘텐츠 유형" value={contentTypeLabels} stepIndex={0} onEdit={onGoToStep} />
          <SummaryCard label="세부 서비스" value={form.services.join(', ')} stepIndex={1} onEdit={onGoToStep} />
          <SummaryCard label="제작 편수" value={form.video_count} stepIndex={3} onEdit={onGoToStep} />
          <SummaryCard label="프로젝트 규모" value={form.project_scale} stepIndex={3} onEdit={onGoToStep} />
          <SummaryCard
            label="예산 범위"
            value={form.budget_range === '협의' ? '미정 (상담 후 결정)' : form.budget_range}
            stepIndex={4}
            onEdit={onGoToStep}
          />
          <SummaryCard
            label="납기일"
            value={form.deadline_flexible ? '일정 협의' : form.deadline}
            stepIndex={4}
            onEdit={onGoToStep}
          />
          <SummaryCard label="미팅 방식" value={meetingLabel} stepIndex={5} onEdit={onGoToStep} />
          <SummaryCard label="희망 일정" value={scheduleLabel} stepIndex={5} onEdit={onGoToStep} />
        </div>
      </div>
    </motion.div>
  );
}
