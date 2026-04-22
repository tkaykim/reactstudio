import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin, canManagePayments, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Row = {
  bu_code: string;
  status: string;
  amount: number | null;
  actual_amount: number | null;
  partner_id: number | null;
  payee_app_user_id: string | null;
  partners?: { display_name: string | null } | null;
  payee?: { name: string | null } | null;
};

export default async function PaymentsByPayeePage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');

  const supabase = await createSupabaseServerClient();
  const q = supabase
    .from('financial_entries')
    .select(
      `bu_code, status, amount, actual_amount, partner_id, payee_app_user_id,
       partners(display_name),
       payee:app_users!financial_entries_payee_app_user_id_fkey(name)`
    )
    .eq('kind', 'expense')
    .eq('bu_code', ADMIN_BU);
  const { data } = await q;

  const map = new Map<
    string,
    { key: string; type: 'partner' | 'staff' | 'other'; name: string; planned: number; paid: number; count: number }
  >();

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
    const entry = map.get(key) ?? { key, type, name, planned: 0, paid: 0, count: 0 };
    entry.count++;
    if (r.status === 'planned') entry.planned += r.amount ?? 0;
    if (r.status === 'paid') entry.paid += r.actual_amount ?? r.amount ?? 0;
    map.set(key, entry);
  }

  const rows = [...map.values()].sort((a, b) => b.planned + b.paid - (a.planned + a.paid));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">인원별 지급 집계</h1>
        <Link href="/admin/finance/payables" className="text-white/50 hover:text-white text-xs">
          ← 목록
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              {['유형', '이름', '건수', '예정 합계', '지급 합계'].map((h) => (
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
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.type === 'partner'
                        ? 'bg-blue-500/20 text-blue-400'
                        : r.type === 'staff'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {r.type === 'partner' ? '외부' : r.type === 'staff' ? '내부' : '기타'}
                  </span>
                </td>
                <td className="px-3 py-3 text-white text-sm">{r.name}</td>
                <td className="px-3 py-3 text-white/70 text-sm">{r.count}건</td>
                <td className="px-3 py-3 text-yellow-400 text-sm">
                  {r.planned.toLocaleString()}원
                </td>
                <td className="px-3 py-3 text-green-400 text-sm">
                  {r.paid.toLocaleString()}원
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-white/30 text-sm">
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
