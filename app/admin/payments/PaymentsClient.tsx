'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, CircleDollarSign, Check } from 'lucide-react';
import {
  FINANCIAL_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type FinancialStatus,
  type PaymentMethod,
} from '@/types';

type PaymentRow = {
  id: number;
  project_id: number | null;
  bu_code: string;
  category: string | null;
  name: string | null;
  amount: number | null;
  actual_amount: number | null;
  due_date: string | null;
  paid_at: string | null;
  status: FinancialStatus;
  payment_method: PaymentMethod | null;
  partner_id: number | null;
  payee_app_user_id: string | null;
  projects?: { name: string | null; bu_code: string | null } | null;
  partners?: { display_name: string | null; name_ko: string | null } | null;
  payee?: { name: string | null; email: string | null } | null;
};

const statusColors: Record<FinancialStatus, string> = {
  planned: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-green-500/20 text-green-400',
  canceled: 'bg-white/10 text-white/40',
};

export default function PaymentsClient() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | FinancialStatus>('all');
  const [filterPayee, setFilterPayee] = useState<'all' | 'partner' | 'staff' | 'other'>('all');
  const [marking, setMarking] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterStatus !== 'all') qs.set('status', filterStatus);
    if (filterPayee !== 'all') qs.set('payee_type', filterPayee);
    const res = await fetch(`/api/admin/payments?${qs.toString()}`);
    const data = await res.json();
    setRows(data.payments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterPayee]);

  async function markPaid(id: number) {
    if (!confirm('지급 완료로 표시하시겠습니까?')) return;
    setMarking(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}/pay`, {
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

  const summary = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let weekPlanned = 0;
    let overdue = 0;
    let monthPaid = 0;
    for (const r of rows) {
      if (r.status === 'planned' && r.due_date) {
        const d = new Date(r.due_date);
        if (d <= weekEnd) weekPlanned += r.amount ?? 0;
        if (d < now) overdue++;
      }
      if (r.status === 'paid' && r.paid_at) {
        const d = new Date(r.paid_at);
        if (d >= monthStart) monthPaid += r.actual_amount ?? r.amount ?? 0;
      }
    }
    return { weekPlanned, overdue, monthPaid };
  }, [rows]);

  const payeeName = (r: PaymentRow) =>
    r.payee?.name ??
    r.partners?.display_name ??
    r.partners?.name_ko ??
    (r.partner_id ? `파트너 #${r.partner_id}` : '-');

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-white/40 text-xs">이번 주 예정</p>
          <p className="text-2xl font-black text-white mt-1">
            {summary.weekPlanned.toLocaleString()}원
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-white/40 text-xs">연체 건수</p>
          <p className={`text-2xl font-black mt-1 ${summary.overdue > 0 ? 'text-red-400' : 'text-white'}`}>
            {summary.overdue}건
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-white/40 text-xs">이번 달 지급완료</p>
          <p className="text-2xl font-black text-white mt-1">
            {summary.monthPaid.toLocaleString()}원
          </p>
        </div>
      </div>

      {/* Filters */}
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
        <div className="flex gap-1 ml-2">
          {[
            ['all', '전체수신자'],
            ['partner', '외부'],
            ['staff', '내부'],
            ['other', '기타'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterPayee(v as 'all' | 'partner' | 'staff' | 'other')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                filterPayee === v
                  ? 'bg-brand text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 size={24} className="animate-spin text-brand mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <CircleDollarSign size={48} className="mx-auto mb-4 opacity-30" />
          <p>지급 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10">
                {['프로젝트', '수신자', '항목', '금액', '예정일', '상태', '방식', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-white/40 text-xs font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-3 text-white/80 text-sm">{r.projects?.name ?? '-'}</td>
                  <td className="px-3 py-3 text-white text-sm">{payeeName(r)}</td>
                  <td className="px-3 py-3">
                    <p className="text-white text-sm">{r.name ?? '-'}</p>
                    {r.category && <p className="text-white/30 text-xs">{r.category}</p>}
                  </td>
                  <td className="px-3 py-3 text-white/80 text-sm">
                    {(r.actual_amount ?? r.amount ?? 0).toLocaleString()}원
                  </td>
                  <td className="px-3 py-3 text-white/50 text-xs">
                    {r.due_date ? new Date(r.due_date).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[r.status]}`}>
                      {FINANCIAL_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-white/50 text-xs">
                    {r.payment_method ? PAYMENT_METHOD_LABELS[r.payment_method] : '-'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {r.status === 'planned' && (
                        <button
                          onClick={() => markPaid(r.id)}
                          disabled={marking === r.id}
                          className="flex items-center gap-1 text-green-400 text-xs hover:underline disabled:opacity-40"
                        >
                          {marking === r.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          지급완료
                        </button>
                      )}
                      <Link
                        href={`/admin/payments/${r.id}`}
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
      )}
    </div>
  );
}
