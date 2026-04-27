'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CompanyOption, EntityKind, PartnerRow } from './PartnersClient';

type Payload = {
  display_name: string;
  entity_type?: EntityKind;
  name_ko: string | null;
  name_en: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  is_active: boolean;
  parent_partner_id?: number | null;
};

export default function PartnerModal({
  mode,
  partner,
  companies,
  defaultEntity,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  partner?: PartnerRow;
  companies: CompanyOption[];
  defaultEntity?: EntityKind;
  onClose: () => void;
  onSubmit: (p: Payload) => Promise<boolean>;
}) {
  const [entity, setEntity] = useState<EntityKind>(
    partner?.entity_type ?? defaultEntity ?? 'organization'
  );
  const [displayName, setDisplayName] = useState(partner?.display_name ?? '');
  const [nameKo, setNameKo] = useState(partner?.name_ko ?? '');
  const [nameEn, setNameEn] = useState(partner?.name_en ?? '');
  const [phone, setPhone] = useState(partner?.phone ?? '');
  const [email, setEmail] = useState(partner?.email ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(partner?.website_url ?? '');
  const [isActive, setIsActive] = useState(partner?.is_active ?? true);
  const [parentId, setParentId] = useState(
    partner?.parent_partner_id ? String(partner.parent_partner_id) : ''
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (!displayName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }
    const payload: Payload = {
      display_name: displayName.trim(),
      name_ko: nameKo.trim() || null,
      name_en: nameEn.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website_url: websiteUrl.trim() || null,
      is_active: isActive,
    };
    if (mode === 'create') payload.entity_type = entity;
    if (entity === 'person') {
      payload.parent_partner_id = parentId === '' ? null : Number(parentId);
    }
    setSubmitting(true);
    const ok = await onSubmit(payload);
    setSubmitting(false);
    if (!ok) return;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {mode === 'create' ? '신규 파트너' : '파트너 편집'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Entity type */}
          <div>
            <label className="block text-white/50 text-xs mb-1.5">종류 *</label>
            <div className="flex gap-2">
              {(['organization', 'person'] as EntityKind[]).map((e) => (
                <button
                  key={e}
                  onClick={() => mode === 'create' && setEntity(e)}
                  disabled={mode === 'edit'}
                  className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                    entity === e
                      ? 'bg-brand text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  } ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {e === 'organization' ? '외주업체' : '외주담당자'}
                </button>
              ))}
            </div>
            {mode === 'edit' && (
              <p className="text-white/30 text-[11px] mt-1">종류는 변경할 수 없습니다.</p>
            )}
          </div>

          <div>
            <label className="block text-white/50 text-xs mb-1">
              {entity === 'person' ? '이름 *' : '업체명 *'}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              placeholder={entity === 'person' ? '홍길동' : 'ABC컴퍼니'}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 text-xs mb-1">한글 보조명</label>
              <input
                type="text"
                value={nameKo}
                onChange={(e) => setNameKo(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">영문 보조명</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 text-xs mb-1">전화</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/50 text-xs mb-1">웹사이트</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          {entity === 'person' && (
            <div>
              <label className="block text-white/50 text-xs mb-1">소속 업체</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              >
                <option value="" className="bg-black">— 무소속 (프리랜서) —</option>
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)} className="bg-black">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-brand"
            />
            <span className="text-white/70 text-sm">활성</span>
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded border border-white/10 text-white/70 hover:bg-white/5 text-sm transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded bg-brand hover:bg-brand/90 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
