'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Trash2, Upload, FileText, Loader2 } from 'lucide-react';

export type CompanyDocKind = 'business_registration' | 'bank_account';

export interface CompanyDoc {
  id: number;
  kind: CompanyDocKind;
  filename: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

const KIND_LABELS: Record<CompanyDocKind, string> = {
  business_registration: '사업자등록증',
  bank_account: '통장사본',
};

const KINDS: CompanyDocKind[] = ['business_registration', 'bank_account'];

export function CompanyDocsCard() {
  const [docs, setDocs] = useState<CompanyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<CompanyDocKind | null>(null);
  const fileRefs = useRef<Record<CompanyDocKind, HTMLInputElement | null>>({
    business_registration: null,
    bank_account: null,
  });

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/company-docs');
      const data = await res.json();
      setDocs(data.docs ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function upload(kind: CompanyDocKind, file: File) {
    setBusyKind(kind);
    try {
      const fd = new FormData();
      fd.append('kind', kind);
      fd.append('file', file);
      const res = await fetch('/api/admin/company-docs', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('업로드 실패: ' + (err.error ?? res.statusText));
      } else {
        await refresh();
      }
    } finally {
      setBusyKind(null);
    }
  }

  async function remove(kind: CompanyDocKind) {
    if (!confirm(`${KIND_LABELS[kind]} 파일을 삭제하시겠습니까?`)) return;
    setBusyKind(kind);
    try {
      await fetch(`/api/admin/company-docs?kind=${kind}`, { method: 'DELETE' });
      await refresh();
    } finally {
      setBusyKind(null);
    }
  }

  function findDoc(kind: CompanyDocKind) {
    return docs.find((d) => d.kind === kind);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 mb-6">
      <div className="mb-1">
        <h2 className="text-white text-sm font-bold">첨부 문서 관리</h2>
        <p className="text-white/40 text-xs mt-0.5">
          발송 시 함께 보낼 수 있는 회사 공통 문서를 등록해두세요. (사업자등록증 · 통장사본)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {KINDS.map((kind) => {
          const doc = findDoc(kind);
          const busy = busyKind === kind;
          return (
            <div
              key={kind}
              className={`rounded-lg border p-4 ${
                doc ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold">{KIND_LABELS[kind]}</p>
                  {doc ? (
                    <>
                      <p className="text-white/70 text-xs mt-1.5 flex items-center gap-1 truncate">
                        <FileText size={12} className="text-green-400 shrink-0" />
                        <span className="truncate">{doc.filename}</span>
                      </p>
                      <p className="text-white/30 text-[11px] mt-0.5">
                        {new Date(doc.uploaded_at).toLocaleDateString('ko-KR')} 업로드
                      </p>
                    </>
                  ) : (
                    <p className="text-white/30 text-xs mt-1.5">등록된 파일이 없습니다.</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc && (
                    <>
                      <a
                        href={`/api/admin/company-docs/download?kind=${kind}`}
                        className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="다운로드"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        onClick={() => remove(kind)}
                        disabled={busy}
                        className="p-1.5 text-white/50 hover:text-red-400 hover:bg-white/10 rounded transition-colors disabled:opacity-40"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => fileRefs.current[kind]?.click()}
                    disabled={busy || loading}
                    className="p-1.5 text-white/50 hover:text-brand hover:bg-white/10 rounded transition-colors disabled:opacity-40"
                    title={doc ? '교체' : '업로드'}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  </button>
                  <input
                    ref={(el) => {
                      fileRefs.current[kind] = el;
                    }}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(kind, f);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
