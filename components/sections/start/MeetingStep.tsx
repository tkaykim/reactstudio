'use client';

import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { StartFormData } from '@/types';
import { MEETING_PREFERENCES, TIME_SLOTS } from '@/types';

interface MeetingStepProps {
  form: StartFormData;
  onUpdate: (patch: Partial<StartFormData>) => void;
}

export default function MeetingStep({ form, onUpdate }: MeetingStepProps) {
  const showSchedule = form.meeting_preference && form.meeting_preference !== 'none';

  return (
    <motion.div
      key="meeting"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
          상담은 어떻게 진행할까요?
        </h2>
        <p className="text-white/50 text-sm">편하신 방식을 선택해 주세요.</p>
      </div>

      <div>
        <Label className="text-white/70 mb-3 block font-medium">미팅 방식</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MEETING_PREFERENCES.map((mp) => (
            <button
              key={mp.value}
              onClick={() => onUpdate({ meeting_preference: mp.value })}
              className={`text-left p-4 rounded-xl border transition-all ${
                form.meeting_preference === mp.value
                  ? 'border-brand bg-brand/10 text-white'
                  : 'border-white/10 text-white/50 hover:border-white/30'
              }`}
            >
              <span className="block font-medium text-sm">{mp.label}</span>
              <span className="block text-xs mt-1 opacity-60">{mp.description}</span>
            </button>
          ))}
        </div>
      </div>

      {showSchedule && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-6"
        >
          <div>
            <Label className="text-white/70 mb-2 block font-medium">
              희망 상담 날짜 (선택)
            </Label>
            <Input
              type="date"
              value={form.preferred_date}
              onChange={(e) => onUpdate({ preferred_date: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label className="text-white/70 mb-3 block font-medium">
              선호 시간대 (선택)
            </Label>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((ts) => (
                <button
                  key={ts}
                  onClick={() => onUpdate({ preferred_time_slot: ts })}
                  className={`px-4 py-2.5 rounded-lg border text-sm transition-all ${
                    form.preferred_time_slot === ts
                      ? 'border-brand bg-brand/10 text-white'
                      : 'border-white/10 text-white/50 hover:border-white/30'
                  }`}
                >
                  {ts}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div>
        <Label className="text-white/70 mb-2 block font-medium">
          추가 요청사항 (선택)
        </Label>
        <Textarea
          placeholder="프로젝트와 관련해 미리 알려주실 내용이 있다면 자유롭게 작성해 주세요."
          value={form.additional_request}
          onChange={(e) => onUpdate({ additional_request: e.target.value })}
          rows={3}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
        />
      </div>
    </motion.div>
  );
}
