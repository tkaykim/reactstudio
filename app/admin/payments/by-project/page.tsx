import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin, canManagePayments, canViewAll } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Row = {
  project_id: number | null;
  bu_code: string;
  status: string;
  amount: number | null;
  actual_amount: number | null;
  projects?: { name: string | null } | null;
};

export default async function PaymentsByProjectPage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');

  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from('financial_entries')
    .select('project_id, bu_code, status, amount, actual_amount, projects(name)')
    .eq('kind', 'expense');
  if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
  const { data } = await q;

  const byProject = new Map<
    string,
    { key: string; project_id: number | null; name: string; bu_code: string; planned: number; paid: number; count: number }
  >();

  for (const r of ((data as unknown) as Row[]) ?? []) {
    const key = `${r.bu_code}:${r.project_id ?? 'none'}`;
    const entry = byProject.get(key) ?? {
      key,
      project_id: r.project_id,
      name: r.projects?.name ?? '(미지정)',
      bu_code: r.bu_code,
      planned: 0,
      paid: 0,
      count: 0,
    };
    entry.count++;
    if (r.status === 'planned') entry.planned += r.amount ?? 0;
    if (r.status === 'paid') entry.paid += r.actual_amount ?? r.amount ?? 0;
    byProject.set(key, entry);
  }

  const rows = [...byProject.values()].sort((a, b) => b.planned + b.paid - (a.planned + a.paid));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">프로젝트별 지급 집계</h1>
        <Link href="/admin/payments" className="text-white/50 hover:text-white text-xs">
          ← 목록
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              {['BU', '프로젝트', '건수', '예정 합계', '지급 합계', ''].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-white/40 text-xs font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-3 text-white/60 text-xs">{r.bu_code}</td>
                <td className="px-3 py-3 text-white text-sm">{r.name}</td>
                <td className="px-3 py-3 text-white/70 text-sm">{r.count}건</td>
                <td className="px-3 py-3 text-yellow-400 text-sm">
                  {r.planned.toLocaleString()}원
                </td>
                <td className="px-3 py-3 text-green-400 text-sm">
                  {r.paid.toLocaleString()}원
                </td>
                <td className="px-3 py-3">
                  {r.project_id && (
                    <Link
                      href={`/admin/payments?project_id=${r.project_id}`}
                      className="text-brand text-xs hover:underline"
                    >
                      내역 보기
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-white/30 text-sm">
                  집계할 지급 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
