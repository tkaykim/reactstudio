'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowDownLeft, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  FINANCIAL_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type FinancialStatus,
  type PaymentMethod,
} from '@/types';

type Row = {
  id: number;
  project_id: number | null;
  contract_id: number | null;
  category: string | null;
  name: string | null;
  amount: number | null;
  actual_amount: number | null;
  due_date: string | null;
  paid_at: string | null;
  status: FinancialStatus;
  payment_method: PaymentMethod | null;
  client_name: string | null;
  projects?: { name: string | null } | null;
  contracts?: { title: string | null; client_name: string | null; client_company: string | null } | null;
};

const statusColors: Record<FinancialStatus, string> = {
  planned: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-green-500/20 text-green-400',
  canceled: 'bg-white/10 text-white/40',
};

const CATEGORY_LABELS: Record<string, string> = {
  deposit: '계약금',
  balance: '잔금',
  misc_revenue: '기타',
};

const PAGE_SIZE = 20;

export default function ReceivablesClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | FinancialStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [marking, setMarking] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterStatus !== 'all') qs.set('status', filterStatus);
    const res = await fetch(`/api/admin/receivables?${qs.toString()}`);
    const data = await res.json();
    setRows(data.receivables ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, search]);

  async function markCollected(id: number) {
    if (!confirm('수금 완료로 표시하시겠습니까?')) return;
    setMarking(id);
    try {
      const res = await fetch(`/api/admin/receivables/${id}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? '처리 실패');
        return;
      }
      await load();
    } finally {
      setMarking(null);
    }
  }

  const clientLabel = (r: Row) =>
    r.client_name ??
    r.contracts?.client_company ??
    r.contracts?.client_name ??
    '-';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.name,
        r.category,
        r.client_name,
        r.projects?.name,
        r.contracts?.title,
        r.contracts?.client_name,
        r.contracts?.client_company,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const summary = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let weekPlanned = 0;
    let overdue = 0;
    let monthCollected = 0;
    let totalSupply = 0;
    let totalCollected = 0;
    for (const r of filtered) {
      totalSupply += r.amount ?? 0;
      if (r.status === 'paid') totalCollected += r.actual_amount ?? r.amount ?? 0;
      if (r.status === 'planned' && r.due_date) {
        const d = new Date(r.due_date);
        if (d <= weekEnd) weekPlanned += r.amount ?? 0;
        if (d < now) overdue++;
      }
      if (r.status === 'paid' && r.paid_at) {
        const d = new Date(r.paid_at);
        if (d >= monthStart) monthCollected += r.actual_amount ?? r.amount ?? 0;
      }
    }
    return { weekPlanned, overdue, monthCollected, totalSupply, totalCollected };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-white/40 text-xs">공급가액 합계</p>
          <p className="text-xl font-black text-white mt-1">
            {summary.totalSupply.toLocaleString()}원
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-white/40 text-xs">실수금액 합계</p>
          <p className="text-xl font-black text-green-400 mt-1">
            {summary.totalCollected.toLocaleString()}원
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-white/40 text-xs">이번 주 수금 예정</p>
          <p className="text-xl font-black text-white mt-1">
            {summary.weekPlanned.toLocaleString()}원
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-white/40 text-xs">연체 건수</p>
          <p className={`text-xl font-black mt-1 ${summary.overdue > 0 ? 'text-red-400' : 'text-white'}`}>
            {summary.overdue}건
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-white/40 text-xs">이번 달 수금완료</p>
          <p className="text-xl font-black text-white mt-1">
            {summary.monthCollected.toLocaleString()}원
          </p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="프로젝트/거래처/항목/계약명 검색"
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-brand"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1">
          {(['all', 'planned', 'paid', 'canceled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                filterStatus === s
                  ? 'bg-brand text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
              }`}
            >
              {s === 'all' ? '전체' : FINANCIAL_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <p className="text-white/40 text-xs self-center">총 {filtered.length.toLocaleString()}건</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 size={24} className="animate-spin text-brand mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <ArrowDownLeft size={48} className="mx-auto mb-4 opacity-30" />
          <p>수금 내역이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-white/10 overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10">
                  {['예정일', '거래처', '프로젝트', '항목', '구분', '공급가액', '실수금액', '상태', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-white/40 text-xs font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-3 text-white/80 text-xs whitespace-nowrap">
                      {r.due_date ? new Date(r.due_date).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-3 py-3 text-white text-sm">{clientLabel(r)}</td>
                    <td className="px-3 py-3 text-white/70 text-sm">{r.projects?.name ?? '-'}</td>
                    <td className="px-3 py-3 text-white text-sm">{r.name ?? '-'}</td>
                    <td className="px-3 py-3 text-white/50 text-xs">
                      {CATEGORY_LABELS[r.category ?? 'misc_revenue'] ?? r.category ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-white/80 text-sm whitespace-nowrap">
                      {(r.amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      {r.actual_amount != null ? (
                        <span className="text-green-400">{r.actual_amount.toLocaleString()}원</span>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[r.status]}`}>
                        {FINANCIAL_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {r.status === 'planned' && (
                          <button
                            onClick={() => markCollected(r.id)}
                            disabled={marking === r.id}
                            className="flex items-center gap-1 text-green-400 text-xs hover:underline disabled:opacity-40"
                          >
                            {marking === r.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            수금완료
                          </button>
                        )}
                        <Link
                          href={`/admin/finance/receivables/${r.id}`}
                          className="text-brand text-xs hover:underline"
                        >
                          상세
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <p className="text-white/60 text-xs">
                {currentPage} / {totalPages}
              </p>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
