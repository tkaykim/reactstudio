'use client';

import { useEffect, useState } from 'react';
import { Paperclip } from 'lucide-react';
import type { CompanyDoc, CompanyDocKind } from './CompanyDocsCard';

const KIND_LABELS: Record<CompanyDocKind, string> = {
  business_registration: '사업자등록증',
  bank_account: '통장사본',
};

interface Props {
  value: CompanyDocKind[];
  onChange: (next: CompanyDocKind[]) => void;
  primaryLabel?: string;
  primaryHint?: string;
}

export function AttachDocsPicker({
  value,
  onChange,
  primaryLabel = '거래명세표 PDF',
  primaryHint = '도장 포함 거래명세표를 PDF 첨부파일로 발송',
}: Props) {
  const [docs, setDocs] = useState<CompanyDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/company-docs')
      .then((r) => r.json())
      .then((d) => setDocs(d.docs ?? []))
      .finally(() => setLoading(false));
  }, []);

  function toggle(kind: CompanyDocKind) {
    onChange(value.includes(kind) ? value.filter((k) => k !== kind) : [...value, kind]);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Paperclip size={14} className="text-white/60" />
        <span className="text-white text-sm font-semibold">발송 항목 선택</span>
      </div>
      <p className="text-white/40 text-xs mb-3">
        이메일에 첨부할 파일을 선택하세요. 거래명세표는 PDF로 첨부됩니다.
      </p>

      <div className="space-y-2">
        <label className="flex items-start gap-2.5 cursor-default">
          <input type="checkbox" checked readOnly className="mt-0.5 accent-brand" />
          <div>
            <p className="text-white text-sm">{primaryLabel}</p>
            <p className="text-white/40 text-xs">{primaryHint}</p>
          </div>
        </label>

        {loading ? (
          <p className="text-white/30 text-xs pl-6">불러오는 중…</p>
        ) : docs.length === 0 ? (
          <p className="text-white/30 text-xs pl-6">등록된 회사 문서가 없습니다.</p>
        ) : (
          docs.map((doc) => (
            <label key={doc.kind} className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={value.includes(doc.kind)}
                onChange={() => toggle(doc.kind)}
                className="mt-0.5 accent-brand"
              />
              <div className="min-w-0">
                <p className="text-white text-sm">{KIND_LABELS[doc.kind]}</p>
                <p className="text-white/40 text-xs truncate">{doc.filename}</p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
