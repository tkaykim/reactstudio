'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types';

type Project = { id: number; name: string; bu_code: string };

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'misc_revenue', label: '기타 매출' },
  { value: 'deposit', label: '계약금' },
  { value: 'balance', label: '잔금' },
];

type Initial = {
  id?: number;
  project_id?: number | null;
  contract_id?: number | null;
  client_name?: string | null;
  category?: string | null;
  name?: string | null;
  amount?: number | null;
  actual_amount?: number | null;
  due_date?: string | null;
  payment_method?: PaymentMethod | null;
  memo?: string | null;
};

export default function ReceivableForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: Initial;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    project_id: initial?.project_id ?? null as number | null,
    contract_id: initial?.contract_id ?? null as number | null,
    client_name: initial?.client_name ?? '',
    category: initial?.category ?? 'misc_revenue',
    name: initial?.name ?? '',
    amount: initial?.amount ?? 0,
    due_date: initial?.due_date ?? '',
    payment_method: (initial?.payment_method ?? 'actual_payment') as PaymentMethod,
    memo: initial?.memo ?? '',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, bu_code')
        .eq('bu_code', 'REACT')
        .order('created_at', { ascending: false })
        .limit(200);
      setProjects((data as Project[]) ?? []);
    })();
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        project_id: form.project_id,
        contract_id: form.contract_id,
        client_name: form.client_name || null,
        category: form.category,
        name: form.name || null,
        amount: Number(form.amount) || 0,
        due_date: form.due_date || null,
        payment_method: form.payment_method,
        memo: form.memo || null,
      };
      const res = await fetch(
        mode === 'create' ? '/api/admin/receivables' : `/api/admin/receivables/${initial?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? '저장 실패');
        return;
      }
      router.push('/admin/finance/receivables');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <div>
        <label className="text-white/50 text-xs mb-1 block">프로젝트</label>
        <select
          value={form.project_id ?? ''}
          onChange={(e) =>
            setForm((f) => ({ ...f, project_id: e.target.value ? Number(e.target.value) : null }))
          }
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
        >
          <option value="" className="bg-black">(프로젝트 없음)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-black">
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block">거래처 (클라이언트)</label>
        <input
          value={form.client_name}
          onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
          placeholder="예) 삼성전자, ABC 스튜디오"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs mb-1 block">항목명</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="예) 1차 계약금"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-1 block">구분</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-black">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs mb-1 block">공급가액 (원)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-1 block">수금 예정일</label>
          <input
            type="date"
            value={form.due_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block">수금 방식</label>
        <select
          value={form.payment_method}
          onChange={(e) =>
            setForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))
          }
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
        >
          {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([v, l]) => (
            <option key={v} value={v} className="bg-black">
              {l}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block">메모</label>
        <textarea
          rows={3}
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 disabled:opacity-40 transition-colors"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        저장
      </button>
    </form>
  );
}
