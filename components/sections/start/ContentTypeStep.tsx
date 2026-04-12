'use client';

import { motion } from 'framer-motion';
import { Music, Tv, ShoppingBag, Check } from 'lucide-react';
import type { ContentType, StartFormData } from '@/types';
import { CONTENT_TYPES } from '@/types';

const ICONS: Record<ContentType, typeof Music> = {
  artwork: Music,
  entertainment: Tv,
  commercial: ShoppingBag,
};

interface ContentTypeStepProps {
  form: StartFormData;
  onUpdate: (patch: Partial<StartFormData>) => void;
}

export default function ContentTypeStep({ form, onUpdate }: ContentTypeStepProps) {
  const toggle = (type: ContentType) => {
    const next = form.content_types.includes(type)
      ? form.content_types.filter((t) => t !== type)
      : [...form.content_types, type];
    onUpdate({ content_types: next });
  };

  return (
    <motion.div
      key="content-type"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
        어떤 콘텐츠를 만들고 싶으신가요?
      </h2>
      <p className="text-white/50 text-sm mb-8">복수 선택 가능합니다.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CONTENT_TYPES.map((ct) => {
          const selected = form.content_types.includes(ct.value);
          const Icon = ICONS[ct.value];
          return (
            <button
              key={ct.value}
              onClick={() => toggle(ct.value)}
              className={`relative text-left p-6 sm:p-8 rounded-2xl border-2 transition-all duration-200 group ${
                selected
                  ? 'border-brand bg-brand/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
              }`}
            >
              {selected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-brand flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                  selected ? 'bg-brand/20' : 'bg-white/5 group-hover:bg-white/10'
                }`}
              >
                <Icon size={28} className={selected ? 'text-brand' : 'text-white/50'} />
              </div>
              <p className="text-brand text-xs font-semibold uppercase tracking-widest mb-1">
                {ct.subtitle}
              </p>
              <h3 className="text-xl font-bold text-white mb-2">{ct.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-4">{ct.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {ct.services.map((s) => (
                  <span
                    key={s}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selected
                        ? 'bg-brand/20 text-brand'
                        : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
