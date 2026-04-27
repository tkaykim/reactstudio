'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Send, Loader2, FileText, X } from 'lucide-react';
import type { Agreement } from '@/types';
import { CompanyDocsCard, type CompanyDocKind } from '@/components/admin/CompanyDocsCard';
import { AttachDocsPicker } from '@/components/admin/AttachDocsPicker';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '작성중', className: 'bg-white/10 text-white/50' },
  sent: { label: '발송완료', className: 'bg-green-500/20 text-green-400' },
};

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<number | null>(null);
  const [pendingSend, setPendingSend] = useState<Agreement | null>(null);
  const [attachDocs, setAttachDocs] = useState<CompanyDocKind[]>([]);

  useEffect(() => {
    fetch('/api/agreement')
      .then((r) => r.json())
      .then((d) => setAgreements(d.agreements ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function confirmSend() {
    if (!pendingSend) return;
    const id = pendingSend.id;
    setSending(id);
    try {
      const res = await fetch('/api/agreement/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: id, attachDocs }),
      });
      const data = await res.json();
      if (data.success) {
        setAgreements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'sent', sent_at: new Date().toISOString() } : a))
        );
        setPendingSend(null);
        setAttachDocs([]);
      } else {
        alert('발송 실패: ' + data.error);
      }
    } finally {
      setSending(null);
    }
  }

  return (
    <div>
      <CompanyDocsCard />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">계약 관리</h1>
        <Link
          href="/admin/agreements/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> 새 계약서
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="animate-spin text-brand mx-auto" size={24} />
        </div>
      ) : agreements.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p>계약서가 없습니다. 새 계약서를 작성해보세요.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10">
                {['계약명', '발주자', '금액', '상태', '발송일', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agreements.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/agreements/new?edit=${a.id}`}
                      className="text-white text-sm font-medium hover:text-brand transition-colors"
                    >
                      {a.title}
                    </Link>
                    <p className="text-white/30 text-xs mt-0.5">
                      RS-A{String(a.id).padStart(5, '0')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white/70 text-sm">{a.client_company}</p>
                    <p className="text-white/30 text-xs">{a.client_email}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70 text-sm">
                    ₩{Number(a.total_amount).toLocaleString()}
                    <span className="text-white/30 text-xs ml-1">
                      {a.vat_type === 'exclusive' ? 'VAT별도' : 'VAT포함'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[a.status]?.className}`}
                    >
                      {statusConfig[a.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/30 text-xs">
                    {a.sent_at ? new Date(a.sent_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'draft' && (
                      <button
                        onClick={() => { setAttachDocs([]); setPendingSend(a); }}
                        disabled={sending === a.id}
                        className="flex items-center gap-1 text-brand text-xs hover:underline disabled:opacity-40"
                      >
                        {sending === a.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        발송
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingSend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => sending === null && setPendingSend(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-neutral-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">계약서 발송</h3>
              <button
                onClick={() => sending === null && setPendingSend(null)}
                className="text-white/40 hover:text-white"
                disabled={sending !== null}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-white/60 text-sm mb-4">
              <b className="text-white">{pendingSend.client_company}</b> ({pendingSend.client_email}) 으로
              <br />
              <span className="text-white/80">{pendingSend.title}</span> 계약서를 발송합니다.
            </p>

            <AttachDocsPicker
              value={attachDocs}
              onChange={setAttachDocs}
              primaryLabel="계약서 DOCX"
              primaryHint="계약서 초안을 DOCX 첨부파일로 발송"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setPendingSend(null)}
                disabled={sending !== null}
                className="px-4 py-2 text-white/60 text-sm hover:text-white disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={confirmSend}
                disabled={sending !== null}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 disabled:opacity-40"
              >
                {sending !== null ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                발송하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
