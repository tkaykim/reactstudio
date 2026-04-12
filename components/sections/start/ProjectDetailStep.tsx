'use client';

import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { StartFormData } from '@/types';
import { VIDEO_COUNTS, PROJECT_SCALES } from '@/types';

interface ProjectDetailStepProps {
  form: StartFormData;
  onUpdate: (patch: Partial<StartFormData>) => void;
}

export default function ProjectDetailStep({ form, onUpdate }: ProjectDetailStepProps) {
  return (
    <motion.div
      key="project-detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
          프로젝트에 대해 알려주세요
        </h2>
        <p className="text-white/50 text-sm">정확하지 않아도 괜찮습니다. 상담 시 조율할 수 있어요.</p>
      </div>

      <div>
        <Label className="text-white/70 mb-3 block font-medium">
          몇 편 정도 제작을 생각하고 계신가요?
        </Label>
        <div className="flex flex-wrap gap-2">
          {VIDEO_COUNTS.map((vc) => (
            <button
              key={vc}
              onClick={() => onUpdate({ video_count: vc })}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                form.video_count === vc
                  ? 'border-brand bg-brand/10 text-white'
                  : 'border-white/10 text-white/50 hover:border-white/30'
              }`}
            >
              {vc}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-white/70 mb-3 block font-medium">프로젝트 규모</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROJECT_SCALES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onUpdate({ project_scale: s.value })}
              className={`text-left p-4 rounded-xl border transition-all ${
                form.project_scale === s.value
                  ? 'border-brand bg-brand/10 text-white'
                  : 'border-white/10 text-white/50 hover:border-white/30'
              }`}
            >
              <span className="block font-medium text-sm">{s.value}</span>
              <span className="block text-xs mt-1 opacity-70">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-white/70 mb-2 block font-medium">프로젝트 설명 (선택)</Label>
        <Textarea
          placeholder="원하시는 영상의 컨셉, 분위기, 참고 사항 등을 자유롭게 작성해 주세요."
          value={form.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={4}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
        />
      </div>

      <div>
        <Label className="text-white/70 mb-2 block font-medium">레퍼런스 URL (선택)</Label>
        <p className="text-white/30 text-xs mb-3">참고할 영상이나 사이트 주소를 입력해 주세요.</p>
        <div className="space-y-2">
          {form.reference_urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={url}
                onChange={(e) => {
                  const next = [...form.reference_urls];
                  next[i] = e.target.value;
                  onUpdate({ reference_urls: next });
                }}
                placeholder="https://"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
              />
              <button
                type="button"
                onClick={() =>
                  onUpdate({ reference_urls: form.reference_urls.filter((_, idx) => idx !== i) })
                }
                className="p-2 text-white/30 hover:text-red-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onUpdate({ reference_urls: [...form.reference_urls, ''] })}
            className="flex items-center gap-2 text-brand text-sm hover:text-orange-400 transition-colors py-1"
          >
            <Plus size={14} /> 레퍼런스 추가
          </button>
        </div>
      </div>
    </motion.div>
  );
}
