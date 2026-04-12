'use client';

import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StartFormData } from '@/types';
import { BUDGET_RANGES } from '@/types';

interface BudgetScheduleStepProps {
  form: StartFormData;
  onUpdate: (patch: Partial<StartFormData>) => void;
}

export default function BudgetScheduleStep({ form, onUpdate }: BudgetScheduleStepProps) {
  const isUndecided = form.budget_range === '협의';

  return (
    <motion.div
      key="budget-schedule"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
          예산과 일정을 알려주세요
        </h2>
        <p className="text-white/50 text-sm">미정이어도 괜찮습니다. 상담을 통해 최적의 방안을 제안드려요.</p>
      </div>

      <div>
        <Label className="text-white/70 mb-3 block font-medium">예산 범위</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUDGET_RANGES.map((b) => (
            <button
              key={b}
              onClick={() => onUpdate({ budget_range: b })}
              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                form.budget_range === b
                  ? 'border-brand bg-brand/10 text-white'
                  : 'border-white/10 text-white/50 hover:border-white/30'
              }`}
            >
              {b === '협의' ? '미정 (상담 후 결정)' : b}
            </button>
          ))}
        </div>
        {isUndecided && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-brand/5 border border-brand/20"
          >
            <Info size={16} className="text-brand flex-shrink-0 mt-0.5" />
            <p className="text-white/60 text-sm">
              괜찮습니다! 상담을 통해 프로젝트 규모에 맞는 최적의 방안을 제안드리겠습니다.
            </p>
          </motion.div>
        )}
      </div>

      <div>
        <Label className="text-white/70 mb-3 block font-medium">
          완성물이 필요한 일정
        </Label>
        <div className="space-y-3">
          <Input
            type="date"
            value={form.deadline_flexible ? '' : form.deadline}
            disabled={form.deadline_flexible}
            onChange={(e) => onUpdate({ deadline: e.target.value })}
            className="bg-white/5 border-white/10 text-white disabled:opacity-30"
          />
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                form.deadline_flexible
                  ? 'border-brand bg-brand'
                  : 'border-white/30 group-hover:border-white/50'
              }`}
              onClick={() =>
                onUpdate({
                  deadline_flexible: !form.deadline_flexible,
                  deadline: !form.deadline_flexible ? '' : form.deadline,
                })
              }
            >
              {form.deadline_flexible && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span
              className="text-white/60 text-sm"
              onClick={() =>
                onUpdate({
                  deadline_flexible: !form.deadline_flexible,
                  deadline: !form.deadline_flexible ? '' : form.deadline,
                })
              }
            >
              급하지 않음 (일정 협의 가능)
            </span>
          </label>
        </div>
      </div>
    </motion.div>
  );
}
