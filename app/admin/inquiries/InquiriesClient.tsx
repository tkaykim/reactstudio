'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { FileText, FileSignature, ExternalLink } from 'lucide-react';
import type { Inquiry } from '@/types';

const statusOptions = [
  { value: 'new', label: '신규', className: 'bg-brand/20 text-brand' },
  { value: 'in_progress', label: '처리중', className: 'bg-blue-500/20 text-blue-400' },
  { value: 'done', label: '완료', className: 'bg-green-500/20 text-green-400' },
];

export default function InquiriesClient({ initialInquiries }: { initialInquiries: Inquiry[] }) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);

  const fetchQuoteForInquiry = useCallback(async (inquiryId: number) => {
    setSelectedQuoteId(null);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('quotes')
      .select('id')
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (data) setSelectedQuoteId(data.id);
  }, []);

  useEffect(() => {
    if (selected) fetchQuoteForInquiry(selected.id);
  }, [selected, fetchQuoteForInquiry]);

  const filtered =
    filterStatus === 'all' ? inquiries : inquiries.filter((i) => i.status === filterStatus);

  const updateStatus = async (id: number, status: string) => {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('inquiries').update({ status }).eq('id', id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status: status as Inquiry['status'] } : i)));
    if (selected?.id === id) setSelected((s) => s ? { ...s, status: status as Inquiry['status'] } : null);
  };

  const getStatusClass = (s: string) =>
    statusOptions.find((o) => o.value === s)?.className ?? '';
  const getStatusLabel = (s: string) =>
    statusOptions.find((o) => o.value === s)?.label ?? s;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">문의 관리</h1>
        <div className="flex gap-2">
          {[{ value: 'all', label: '전체' }, ...statusOptions].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filterStatus === opt.value
                  ? 'bg-brand text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-white/30">문의가 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10">
                  {['이름', '회사', '서비스', '상태', '일시', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-white/40 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inq) => (
                  <tr
                    key={inq.id}
                    className={`border-b border-white/5 cursor-pointer transition-colors ${
                      selected?.id === inq.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                    }`}
                    onClick={() => setSelected(inq)}
                  >
                    <td className="px-4 py-3 text-white text-sm font-medium">{inq.name}</td>
                    <td className="px-4 py-3 text-white/50 text-sm">{inq.company || '-'}</td>
                    <td className="px-4 py-3 text-white/50 text-sm">{inq.services.slice(0, 2).join(', ')}</td>
                    <td className="px-4 py-3">
                      <select
                        value={inq.status}
                        onChange={(e) => { e.stopPropagation(); updateStatus(inq.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className={`px-2 py-0.5 rounded text-xs font-medium border-0 outline-none cursor-pointer ${getStatusClass(inq.status)}`}
                      >
                        {statusOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-xs">
                      {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quotes/${inq.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-brand text-xs hover:underline"
                      >
                        <FileText size={12} /> 견적서
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">{selected.name}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(selected.status)}`}>
                {getStatusLabel(selected.status)}
              </span>
            </div>

            {[
              ['회사', selected.company || '-'],
              ['이메일', selected.email],
              ['전화', selected.phone],
              ['프로젝트', selected.project_title || '-'],
              ['서비스', selected.services.join(', ')],
              ['규모', selected.project_scale || '-'],
              ['예산', selected.budget_range || '-'],
              ['납기', selected.deadline || '-'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-white/30 text-xs mb-0.5">{label}</p>
                <p className="text-white/80 text-sm break-all">{value}</p>
              </div>
            ))}

            {selected.description && (
              <div>
                <p className="text-white/30 text-xs mb-0.5">상세 설명</p>
                <p className="text-white/80 text-sm whitespace-pre-wrap">{selected.description}</p>
              </div>
            )}

            {(() => {
              const urls = selected.reference_urls?.length
                ? selected.reference_urls
                : selected.reference_url
                ? [selected.reference_url]
                : [];
              return urls.length > 0 ? (
                <div>
                  <p className="text-white/30 text-xs mb-1">레퍼런스</p>
                  <div className="space-y-1">
                    {urls.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-brand text-sm hover:underline break-all"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {selected.message && (
              <div>
                <p className="text-white/30 text-xs mb-0.5">메시지</p>
                <p className="text-white/80 text-sm whitespace-pre-wrap">{selected.message}</p>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <Link
                href={`/admin/quotes/${selected.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 transition-colors"
              >
                <FileText size={14} /> 견적서
              </Link>
              <Link
                href={`/admin/contracts/new?inquiry_id=${selected.id}${selectedQuoteId ? `&quote_id=${selectedQuoteId}` : ''}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/10 text-white text-sm font-semibold rounded hover:bg-white/20 transition-colors"
              >
                <FileSignature size={14} /> 상세 견적서
              </Link>
            </div>
            <Link
              href={`/admin/agreements/new?inquiry_id=${selected.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 mt-1 bg-white/5 text-white/60 text-sm rounded hover:bg-white/10 hover:text-white transition-colors"
            >
              <FileSignature size={14} /> 계약서 작성
            </Link>

            {selected.client_token && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/client/${selected.client_token}`;
                  navigator.clipboard.writeText(url);
                }}
                className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-white/30 text-xs hover:text-white/60 transition-colors"
              >
                <ExternalLink size={12} /> 클라이언트 포털 링크 복사
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
