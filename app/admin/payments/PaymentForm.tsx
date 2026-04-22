'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type BuCode } from '@/types';

const ADMIN_BU: BuCode = 'REACT';

type Project = { id: number; name: string; bu_code: string };
type Partner = { id: number; display_name: string; name_ko: string | null };
type Staff = { id: string; name: string; email: string | null; bu_code: string | null };

type Initial = {
  id?: number;
  project_id?: number | null;
  bu_code?: BuCode | null;
  category?: string | null;
  name?: string | null;
  amount?: number | null;
  actual_amount?: number | null;
  due_date?: string | null;
  payment_method?: PaymentMethod | null;
  partner_id?: number | null;
  payee_app_user_id?: string | null;
  share_rate?: number | null;
  memo?: string | null;
};

export default function PaymentForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: Initial;
  defaultBuCode?: BuCode;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [partnerQuery, setPartnerQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    project_id: initial?.project_id ?? null,
    payee_type: initial?.payee_app_user_id ? 'staff' : initial?.partner_id ? 'partner' : 'partner',
    partner_id: initial?.partner_id ?? null as number | null,
    payee_app_user_id: initial?.payee_app_user_id ?? null as string | null,
    category: initial?.category ?? '',
    name: initial?.name ?? '',
    amount: initial?.amount ?? 0,
    due_date: initial?.due_date ?? '',
    payment_method: (initial?.payment_method ?? 'actual_payment') as PaymentMethod,
    share_rate: initial?.share_rate ?? '',
    memo: initial?.memo ?? '',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, bu_code')
        .eq('bu_code', ADMIN_BU)
        .order('created_at', { ascending: false })
        .limit(200);
      setProjects((data as Project[]) ?? []);
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_users')
        .select('id, name, email, bu_code')
        .eq('status', 'active')
        .eq('bu_code', ADMIN_BU)
        .order('name');
      setStaff((data as Staff[]) ?? []);
    })();
  }, [supabase]);

  useEffect(() => {
    // Partner search (debounced minimal)
    const t = setTimeout(async () => {
      const q = partnerQuery.trim();
      let query = supabase
        .from('partners')
        .select('id, display_name, name_ko')
        .eq('is_active', true)
        .order('display_name')
        .limit(30);
      if (q) query = query.or(`display_name.ilike.%${q}%,name_ko.ilike.%${q}%`);
      const { data } = await query;
      setPartners((data as Partner[]) ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [supabase, partnerQuery]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        project_id: form.project_id,
        category: form.category || null,
        name: form.name || null,
        amount: Number(form.amount) || 0,
        due_date: form.due_date || null,
        payment_method: form.payment_method,
        partner_id: form.payee_type === 'partner' ? form.partner_id : null,
        payee_app_user_id: form.payee_type === 'staff' ? form.payee_app_user_id : null,
        share_rate: form.share_rate === '' ? null : Number(form.share_rate),
        memo: form.memo || null,
      };
      const res = await fetch(
        mode === 'create' ? '/api/admin/payments' : `/api/admin/payments/${initial?.id}`,
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
      router.push('/admin/payments');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">

      {/* Project */}
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

      {/* Payee type */}
      <div>
        <label className="text-white/50 text-xs mb-1 block">수신자 유형</label>
        <div className="flex gap-2">
          {(['partner', 'staff', 'other'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, payee_type: t }))}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                form.payee_type === t ? 'bg-brand text-white' : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {t === 'partner' ? '외부 파트너' : t === 'staff' ? '내부 직원' : '기타'}
            </button>
          ))}
        </div>
      </div>

      {form.payee_type === 'partner' && (
        <div>
          <label className="text-white/50 text-xs mb-1 block">파트너 검색</label>
          <input
            type="text"
            value={partnerQuery}
            onChange={(e) => setPartnerQuery(e.target.value)}
            placeholder="이름으로 검색"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand mb-2"
          />
          <select
            value={form.partner_id ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, partner_id: e.target.value ? Number(e.target.value) : null }))
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          >
            <option value="" className="bg-black">(선택)</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id} className="bg-black">
                {p.display_name}
                {p.name_ko ? ` (${p.name_ko})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {form.payee_type === 'staff' && (
        <div>
          <label className="text-white/50 text-xs mb-1 block">내부 직원</label>
          <select
            value={form.payee_app_user_id ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, payee_app_user_id: e.target.value || null }))
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          >
            <option value="" className="bg-black">(선택)</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id} className="bg-black">
                {s.name} ({s.bu_code ?? '-'})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs mb-1 block">항목명</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="예) 2차 인건비"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-1 block">카테고리</label>
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="예) 촬영, 편집, 렌탈"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs mb-1 block">금액 (원)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-1 block">지급 예정일</label>
          <input
            type="date"
            value={form.due_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs mb-1 block">지급 방식</label>
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
          <label className="text-white/50 text-xs mb-1 block">지분율 % (선택)</label>
          <input
            type="number"
            step="0.01"
            value={form.share_rate}
            onChange={(e) => setForm((f) => ({ ...f, share_rate: e.target.value }))}
            placeholder="예) 30"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
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
