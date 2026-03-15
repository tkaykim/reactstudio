'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Send, Eye, Loader2, FileSignature } from 'lucide-react';
import type { Contract } from '@/types';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '작성중', className: 'bg-white/10 text-white/50' },
  sent: { label: '발송됨', className: 'bg-blue-500/20 text-blue-400' },
  viewed: { label: '열람됨', className: 'bg-purple-500/20 text-purple-400' },
  signed: { label: '서명완료', className: 'bg-green-500/20 text-green-400' },
  completed: { label: '완료', className: 'bg-green-700/20 text-green-300' },
  cancelled: { label: '취소', className: 'bg-red-500/20 text-red-400' },
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/contract')
      .then((r) => r.json())
      .then((d) => setContracts(d.contracts ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function sendContract(id: number) {
    setSending(id);
    try {
      const res = await fetch('/api/contract/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'sent', sent_at: new Date().toISOString() } : c));
      }
    } finally {
      setSending(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">계약 관리</h1>
        <Link
          href="/admin/contracts/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> 새 계약서
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin text-brand mx-auto" size={24} /></div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <FileSignature size={48} className="mx-auto mb-4 opacity-30" />
          <p>계약서가 없습니다. 새 계약서를 작성해보세요.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10">
                {['계약명', '고객', '금액(VAT포함)', '상태', '발송일', '서명일', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/contracts/new?edit=${c.id}`} className="text-white text-sm font-medium hover:text-brand transition-colors">
                      {c.title}
                    </Link>
                    <p className="text-white/30 text-xs mt-0.5">RS-C{String(c.id).padStart(5, '0')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white/70 text-sm">{c.client_name}</p>
                    <p className="text-white/30 text-xs">{c.client_company || c.client_email}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70 text-sm">{Number(c.total_amount).toLocaleString()}원</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[c.status]?.className}`}>
                      {statusConfig[c.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/30 text-xs">{c.sent_at ? new Date(c.sent_at).toLocaleDateString('ko-KR') : '-'}</td>
                  <td className="px-4 py-3 text-white/30 text-xs">{c.client_signed_at ? new Date(c.client_signed_at).toLocaleDateString('ko-KR') : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.status === 'draft' && (
                        <button
                          onClick={() => sendContract(c.id)}
                          disabled={sending === c.id}
                          className="flex items-center gap-1 text-brand text-xs hover:underline disabled:opacity-40"
                        >
                          {sending === c.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          발송
                        </button>
                      )}
                      {c.client_signature_data && (
                        <button
                          onClick={() => window.open(`/contract/sign/${c.sign_token}`, '_blank')}
                          className="flex items-center gap-1 text-green-400 text-xs hover:underline"
                        >
                          <Eye size={12} /> 확인
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
