import { redirect } from 'next/navigation';
import { requireAdmin, canManagePayments, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Row = {
  status: string;
  amount: number | null;
  actual_amount: number | null;
  due_date: string | null;
  paid_at: string | null;
  partner_id: number | null;
  payee_app_user_id: string | null;
  partners?: { display_name: string | null } | null;
  payee?: { name: string | null } | null;
};

type Agg = {
  key: string;
  type: 'partner' | 'staff' | 'other';
  name: string;
  planned: number;
  paid: number;
  monthPaid: number;
  overdue: number;
  overdueAmt: number;
  count: number;
};

function fmt(n: number) {
  return n.toLocaleString();
}

export default async function FinanceByPersonPage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('financial_entries')
    .select(
      `status, amount, actual_amount, due_date, paid_at, partner_id, payee_app_user_id,
       partners(display_name),
       payee:app_users!financial_entries_payee_app_user_id_fkey(name)`
    )
    .eq('kind', 'expense')
    .eq('bu_code', ADMIN_BU)
    .neq('status', 'canceled');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const map = new Map<string, Agg>();

  for (const r of ((data as unknown) as Row[]) ?? []) {
    let type: 'partner' | 'staff' | 'other' = 'other';
    let name = '(기타)';
    let key = 'other';
    if (r.partner_id) {
      type = 'partner';
      key = `p:${r.partner_id}`;
      name = r.partners?.display_name ?? `파트너 #${r.partner_id}`;
    } else if (r.payee_app_user_id) {
      type = 'staff';
      key = `s:${r.payee_app_user_id}`;
      name = r.payee?.name ?? `직원 #${r.payee_app_user_id.slice(0, 6)}`;
    }
    const entry =
      map.get(key) ??
      ({
        key,
        type,
        name,
        planned: 0,
        paid: 0,
        monthPaid: 0,
        overdue: 0,
        overdueAmt: 0,
        count: 0,
      } as Agg);
    entry.count++;
    const amt = r.amount ?? 0;
    const actual = r.actual_amount ?? r.amount ?? 0;
    if (r.status === 'planned') {
      entry.planned += amt;
      if (r.due_date && new Date(r.due_date) < today) {
        entry.overdue++;
        entry.overdueAmt += amt;
      }
    }
    if (r.status === 'paid') {
      entry.paid += actual;
      if (r.paid_at && new Date(r.paid_at) >= monthStart) {
        entry.monthPaid += actual;
      }
    }
    map.set(key, entry);
  }

  const partners = [...map.values()].filter((r) => r.type === 'partner').sort((a, b) => b.planned + b.paid - (a.planned + a.paid));
  const staff = [...map.values()].filter((r) => r.type === 'staff').sort((a, b) => b.planned + b.paid - (a.planned + a.paid));
  const others = [...map.values()].filter((r) => r.type === 'other');

  const Section = ({
    title,
    hint,
    rows,
    tone,
  }: {
    title: string;
    hint: string;
    rows: Agg[];
    tone: 'blue' | 'purple' | 'gray';
  }) => {
    const toneBg = tone === 'blue' ? 'bg-blue-500/20 text-blue-400' : tone === 'purple' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-white/50';
    return (
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-white font-bold">{title}</h2>
            <p className="text-white/40 text-xs mt-0.5">{hint}</p>
          </div>
          <span className="text-white/40 text-xs">{rows.length}명</span>
        </div>
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10">
                {['유형', '이름', '건수', '예정', '완료 (누적)', '이번달', '연체'].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-white/40 text-xs font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${toneBg}`}>
                      {tone === 'blue' ? '외부' : tone === 'purple' ? '내부' : '기타'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-white text-sm">{r.name}</td>
                  <td className="px-3 py-3 text-white/70 text-sm">{r.count}건</td>
                  <td className="px-3 py-3 text-yellow-400 text-sm whitespace-nowrap">
                    {fmt(r.planned)}원
                  </td>
                  <td className="px-3 py-3 text-green-400 text-sm whitespace-nowrap">
                    {fmt(r.paid)}원
                  </td>
                  <td className="px-3 py-3 text-white/80 text-sm whitespace-nowrap">
                    {fmt(r.monthPaid)}원
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap">
                    {r.overdue > 0 ? (
                      <span className="text-red-400">
                        {r.overdue}건 · {fmt(r.overdueAmt)}원
                      </span>
                    ) : (
                      <span className="text-white/30">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-white/30 text-sm">
                    집계할 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">인원별 집계</h1>
        <p className="text-white/40 text-xs mt-1">파트너·직원별 지급 현황 요약</p>
      </div>
      <Section title="외부 파트너" hint="프리랜서·업체" rows={partners} tone="blue" />
      <Section title="내부 직원" hint="입금 대상 app_user로 연결된 건" rows={staff} tone="purple" />
      {others.length > 0 && (
        <Section title="기타" hint="수신자 미지정 건" rows={others} tone="gray" />
      )}
    </div>
  );
}
