'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { StartFormData } from '@/types';
import { CONTENT_TYPES } from '@/types';

interface ServiceDetailStepProps {
  form: StartFormData;
  onUpdate: (patch: Partial<StartFormData>) => void;
}

export default function ServiceDetailStep({ form, onUpdate }: ServiceDetailStepProps) {
  const availableServices = CONTENT_TYPES.filter((ct) =>
    form.content_types.includes(ct.value)
  ).flatMap((ct) => ct.services);

  const unique = [...new Set(availableServices)];

  const toggle = (svc: string) => {
    const next = form.services.includes(svc)
      ? form.services.filter((s) => s !== svc)
      : [...form.services, svc];
    onUpdate({ services: next });
  };

  const hasCustom = form.services.includes('기타');

  return (
    <motion.div
      key="service-detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
        세부 서비스를 선택해 주세요
      </h2>
      <p className="text-white/50 text-sm mb-8">해당되는 항목을 모두 선택하세요.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {unique.map((svc) => {
          const selected = form.services.includes(svc);
          return (
            <button
              key={svc}
              onClick={() => toggle(svc)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selected
                  ? 'border-brand bg-brand/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{svc}</span>
                {selected && <Check size={16} className="text-brand" />}
              </div>
            </button>
          );
        })}
      </div>

      {hasCustom && (
        <div className="mt-4">
          <Input
            placeholder="원하시는 서비스를 직접 입력해 주세요"
            value={form.custom_service}
            onChange={(e) => onUpdate({ custom_service: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      )}
    </motion.div>
  );
}
