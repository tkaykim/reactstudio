'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Trash2 } from 'lucide-react';
import { FINANCIAL_STATUS_LABELS, type FinancialStatus } from '@/types';

export default function PaymentActions({
  id,
  status,
  amount,
}: {
  id: number;
  status: FinancialStatus;
  amount: number | null;
}) {
  const router = useRouter();
  const [acting, setActing] = useState<'pay' | 'delete' | null>(null);
  const [actualAmount, setActualAmount] = useState<string>(String(amount ?? ''));
  const [paymentRef, setPaymentRef] = useState('');

  async function markPaid() {
    setActing('pay');
    try {
      const res = await fetch(`/api/admin/payments/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_amount: actualAmount ? Number(actualAmount) : undefined,
          payment_ref: paymentRef || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? '실패');
        return;
      }
      router.refresh();
    } finally {
      setActing(null);
    }
  }

  async function remove() {
    if (!confirm('이 지급 건을 삭제하시겠습니까?')) return;
    setActing('delete');
    try {
      const res = await fetch(`/api/admin/payments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? '실패');
        return;
      }
      router.push('/admin/payments');
      router.refresh();
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-white/40 text-xs">상태</p>
          <p className="text-white font-bold">{FINANCIAL_STATUS_LABELS[status]}</p>
        </div>

        {status === 'planned' && (
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-white/50 text-xs block">실지급액</label>
              <input
                type="number"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm w-36 focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs block">증빙 참조</label>
              <input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="이체번호, 영수증 등"
                className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm w-48 focus:outline-none focus:border-brand"
              />
            </div>
            <button
              onClick={markPaid}
              disabled={acting === 'pay'}
              className="flex items-center gap-1 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold rounded hover:bg-green-500/30 disabled:opacity-40 transition-colors"
            >
              {acting === 'pay' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              지급 완료
            </button>
          </div>
        )}

        <button
          onClick={remove}
          disabled={acting === 'delete'}
          className="flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:border-red-400/30 text-xs rounded transition-colors"
        >
          {acting === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          삭제
        </button>
      </div>
    </div>
  );
}
