import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin, canManagePayments, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Row = {
  project_id: number | null;
  kind: 'revenue' | 'expense';
  status: string;
  amount: number | null;
  actual_amount: number | null;
  projects?: { name: string | null } | null;
};

type Agg = {
  key: string;
  project_id: number | null;
  name: string;
  revPlanned: number;
  revPaid: number;
  expPlanned: number;
  expPaid: number;
  count: number;
};

function fmt(n: number) {
  return n.toLocaleString();
}

export default async function FinanceByProjectPage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('financial_entries')
    .select('project_id, kind, status, amount, actual_amount, projects(name)')
    .eq('bu_code', ADMIN_BU)
    .neq('status', 'canceled');

  const map = new Map<string, Agg>();

  for (const r of ((data as unknown) as Row[]) ?? []) {
    const key = `${r.project_id ?? 'none'}`;
    const entry =
      map.get(key) ??
      {
        key,
        project_id: r.project_id,
        name: r.projects?.name ?? '(프로젝트 미지정)',
        revPlanned: 0,
        revPaid: 0,
        expPlanned: 0,
        expPaid: 0,
        count: 0,
      };
    entry.count++;
    const amt = r.amount ?? 0;
    const actual = r.actual_amount ?? r.amount ?? 0;
    if (r.kind === 'revenue') {
      if (r.status === 'planned') entry.revPlanned += amt;
      if (r.status === 'paid') entry.revPaid += actual;
    } else {
      if (r.status === 'planned') entry.expPlanned += amt;
      if (r.status === 'paid') entry.expPaid += actual;
    }
    map.set(key, entry);
  }

  const rows = [...map.values()]
    .map((r) => {
      const revenue = r.revPlanned + r.revPaid;
      const expense = r.expPlanned + r.expPaid;
      const profit = revenue - expense;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : null;
      return { ...r, revenue, expense, profit, margin };
    })
    .sort((a, b) => b.revenue + b.expense - (a.revenue + a.expense));

  const total = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      expense: acc.expense + r.expense,
      profit: acc.profit + r.profit,
    }),
    { revenue: 0, expense: 0, profit: 0 }
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">프로젝트별 집계</h1>
        <p className="text-white/40 text-xs mt-1">프로젝트별 수금·지급·수익성 요약</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
          <p className="text-white/40 text-xs">총 수금 (예정+완료)</p>
          <p className="text-xl font-black text-green-400 mt-1">{fmt(total.revenue)}원</p>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
          <p className="text-white/40 text-xs">총 지급 (예정+완료)</p>
          <p className="text-xl font-black text-red-400 mt-1">{fmt(total.expense)}원</p>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
          <p className="text-white/40 text-xs">합산 예상 순이익</p>
          <p className={`text-xl font-black mt-1 ${total.profit >= 0 ? 'text-white' : 'text-red-400'}`}>
            {total.profit >= 0 ? '+' : '−'}{fmt(Math.abs(total.profit))}원
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              {[
                '프로젝트',
                '수금 예정',
                '수금 완료',
                '지급 예정',
                '지급 완료',
                '순이익',
                '마진율',
                '',
              ].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-white/40 text-xs font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-3 text-white text-sm">{r.name}</td>
                <td className="px-3 py-3 text-yellow-400 text-sm whitespace-nowrap">
                  {fmt(r.revPlanned)}원
                </td>
                <td className="px-3 py-3 text-green-400 text-sm whitespace-nowrap">
                  {fmt(r.revPaid)}원
                </td>
                <td className="px-3 py-3 text-yellow-400/80 text-sm whitespace-nowrap">
                  {fmt(r.expPlanned)}원
                </td>
                <td className="px-3 py-3 text-red-400 text-sm whitespace-nowrap">
                  {fmt(r.expPaid)}원
                </td>
                <td className="px-3 py-3 text-sm whitespace-nowrap">
                  <span className={r.profit >= 0 ? 'text-white font-semibold' : 'text-red-400 font-semibold'}>
                    {r.profit >= 0 ? '+' : '−'}{fmt(Math.abs(r.profit))}원
                  </span>
                </td>
                <td className="px-3 py-3 text-sm whitespace-nowrap">
                  {r.margin == null ? (
                    <span className="text-white/30 text-xs">-</span>
                  ) : (
                    <span
                      className={
                        r.margin >= 30
                          ? 'text-green-400'
                          : r.margin >= 10
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }
                    >
                      {r.margin}%
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {r.project_id && (
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/finance/payables?project_id=${r.project_id}`}
                        className="text-brand text-xs hover:underline"
                      >
                        지급
                      </Link>
                      <Link
                        href={`/admin/finance/receivables?project_id=${r.project_id}`}
                        className="text-brand text-xs hover:underline"
                      >
                        수금
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-white/30 text-sm">
                  집계할 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
