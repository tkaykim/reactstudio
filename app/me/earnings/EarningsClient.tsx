'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Wallet, Calendar, CheckCircle, Clock, Info } from 'lucide-react';
import {
  FINANCIAL_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type FinancialStatus,
  type PaymentMethod,
} from '@/types';

type Entry = {
  id: number;
  kind: 'revenue' | 'expense';
  category: string | null;
  name: string | null;
  amount: number | null;
  actual_amount: number | null;
  occurred_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  status: FinancialStatus;
  payment_method: PaymentMethod | null;
  memo: string | null;
  project_id: number | null;
  projects?: { name: string | null } | null;
  partners?: { display_name: string | null; name_ko: string | null } | null;
};

const statusColors: Record<FinancialStatus, string> = {
  planned: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-green-500/20 text-green-400',
  canceled: 'bg-white/10 text-white/40',
};

export default function EarningsClient({ hasPartnerLink }: { hasPartnerLink: boolean }) {
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | FinancialStatus>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filter !== 'all') qs.set('status', filter);
    const res = await fetch(`/api/me/earnings?${qs.toString()}`);
    const data = await res.json();
    setRows(data.entries ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const summary = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    let ytdPaid = 0;
    let plannedTotal = 0;
    let plannedCount = 0;
    let lastPaid: Date | null = null;
    for (const r of rows) {
      if (r.status === 'paid') {
        if (r.paid_at && new Date(r.paid_at) >= yearStart) {
          ytdPaid += r.actual_amount ?? r.amount ?? 0;
        }
        if (r.paid_at) {
          const d = new Date(r.paid_at);
          if (!lastPaid || d > lastPaid) lastPaid = d;
        }
      }
      if (r.status === 'planned') {
        plannedTotal += r.amount ?? 0;
        plannedCount++;
      }
    }
    return { ytdPaid, plannedTotal, plannedCount, lastPaid };
  }, [rows]);

  const byStatus = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const da = a.due_date || a.occurred_at || '';
      const db = b.due_date || b.occurred_at || '';
      return db.localeCompare(da);
    });
    return sorted;
  }, [rows]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 size={24} className="animate-spin text-brand mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-1.5">
            <CheckCircle size={13} className="text-green-400" />
            올해 실수령 합계
          </div>
          <p className="text-xl font-black text-green-400">
            {summary.ytdPaid.toLocaleString()}<span className="text-sm text-white/50 font-bold ml-0.5">원</span>
          </p>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-1.5">
            <Clock size={13} className="text-yellow-400" />
            지급 예정
          </div>
          <p className="text-xl font-black text-white">
            {summary.plannedTotal.toLocaleString()}<span className="text-sm text-white/50 font-bold ml-0.5">원</span>
          </p>
          <p className="text-white/40 text-[11px] mt-1">{summary.plannedCount}건</p>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-1.5">
            <Calendar size={13} className="text-blue-400" />
            최근 지급일
          </div>
          <p className="text-lg font-black text-white">
            {summary.lastPaid
              ? summary.lastPaid.toLocaleDateString('ko-KR')
              : <span className="text-white/40 text-sm font-normal">없음</span>}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4">
        {(['all', 'planned', 'paid', 'canceled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              filter === s
                ? 'bg-brand text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
            }`}
          >
            {s === 'all' ? '전체' : FINANCIAL_STATUS_LABELS[s]}
          </button>
        ))}
        <div className="flex-1" />
        <p className="text-white/40 text-xs self-center">총 {byStatus.length}건</p>
      </div>

      {byStatus.length === 0 ? (
        <div className="text-center py-20 border border-white/10 rounded-xl">
          <Wallet size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/50 text-sm">
            {filter === 'all' ? '지급 내역이 없습니다.' : '해당 상태의 내역이 없습니다.'}
          </p>
          {!hasPartnerLink && filter === 'all' && (
            <div className="mt-4 inline-flex items-start gap-2 max-w-md text-left text-xs text-white/40 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                파트너 정보가 연결되지 않았다면 지급 내역이 표시되지 않을 수 있습니다. 매니저에게
                문의하세요.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10">
                {['예정일', '프로젝트', '항목', '공급가액', '실수령액', '상태'].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-white/40 text-xs font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byStatus.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                    >
                      <td className="px-3 py-3 text-white/80 text-xs whitespace-nowrap">
                        {r.due_date
                          ? new Date(r.due_date).toLocaleDateString('ko-KR')
                          : r.occurred_at
                            ? new Date(r.occurred_at).toLocaleDateString('ko-KR')
                            : '-'}
                      </td>
                      <td className="px-3 py-3 text-white/80 text-sm">
                        {r.projects?.name ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-white text-sm">
                        {r.name ?? '-'}
                        {r.category && (
                          <span className="text-white/30 text-[11px] ml-2">· {r.category}</span>
                        )}
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
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColors[r.status]}`}
                        >
                          {FINANCIAL_STATUS_LABELS[r.status]}
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                        <td colSpan={6} className="px-4 py-4 text-xs text-white/60">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <div className="text-white/40 mb-1">지급 방식</div>
                              <div className="text-white/80">
                                {r.payment_method
                                  ? PAYMENT_METHOD_LABELS[r.payment_method]
                                  : '-'}
                              </div>
                            </div>
                            <div>
                              <div className="text-white/40 mb-1">지급 완료일</div>
                              <div className="text-white/80">
                                {r.paid_at
                                  ? new Date(r.paid_at).toLocaleDateString('ko-KR')
                                  : '-'}
                              </div>
                            </div>
                            {r.partners?.display_name && (
                              <div>
                                <div className="text-white/40 mb-1">파트너</div>
                                <div className="text-white/80">
                                  {r.partners.display_name}
                                  {r.partners.name_ko ? ` (${r.partners.name_ko})` : ''}
                                </div>
                              </div>
                            )}
                            {r.memo && (
                              <div className="col-span-2 md:col-span-4">
                                <div className="text-white/40 mb-1">메모</div>
                                <div className="text-white/80 whitespace-pre-wrap">{r.memo}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
