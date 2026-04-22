import Link from 'next/link';
import { requireAdmin, canManagePayments, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, TrendingUp } from 'lucide-react';
import { FINANCIAL_STATUS_LABELS, type FinancialStatus } from '@/types';

type Entry = {
  id: number;
  kind: 'revenue' | 'expense';
  status: FinancialStatus;
  category: string | null;
  name: string | null;
  amount: number | null;
  actual_amount: number | null;
  due_date: string | null;
  paid_at: string | null;
  client_name: string | null;
  projects?: { name: string | null } | null;
  partners?: { display_name: string | null; name_ko: string | null } | null;
  payee?: { name: string | null } | null;
  contracts?: { title: string | null; client_name: string | null; client_company: string | null } | null;
};

function fmt(n: number) {
  return n.toLocaleString();
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function FinanceDashboardPage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');

  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const twoWeekEnd = new Date(today);
  twoWeekEnd.setDate(twoWeekEnd.getDate() + 14);

  const { data: allData } = await supabase
    .from('financial_entries')
    .select(
      `id, kind, status, category, name, amount, actual_amount, due_date, paid_at, client_name,
       projects(name),
       partners(display_name, name_ko),
       payee:app_users!financial_entries_payee_app_user_id_fkey(name),
       contracts(title, client_name, client_company)`
    )
    .eq('bu_code', ADMIN_BU)
    .neq('status', 'canceled')
    .order('due_date', { ascending: true, nullsFirst: false });

  const entries = (allData as unknown as Entry[]) ?? [];
  const receivables = entries.filter((e) => e.kind === 'revenue');
  const payables = entries.filter((e) => e.kind === 'expense');

  let monthInflow = 0;
  let monthOutflow = 0;
  let weekReceivables = 0;
  let weekPayables = 0;
  let overdueRec = 0;
  let overduePay = 0;
  let overdueRecAmt = 0;
  let overduePayAmt = 0;

  for (const r of receivables) {
    if (r.status === 'paid' && r.paid_at && new Date(r.paid_at) >= monthStart) {
      monthInflow += r.actual_amount ?? r.amount ?? 0;
    }
    if (r.status === 'planned' && r.due_date) {
      const d = new Date(r.due_date);
      if (d >= today && d <= weekEnd) weekReceivables += r.amount ?? 0;
      if (d < today) {
        overdueRec++;
        overdueRecAmt += r.amount ?? 0;
      }
    }
  }
  for (const e of payables) {
    if (e.status === 'paid' && e.paid_at && new Date(e.paid_at) >= monthStart) {
      monthOutflow += e.actual_amount ?? e.amount ?? 0;
    }
    if (e.status === 'planned' && e.due_date) {
      const d = new Date(e.due_date);
      if (d >= today && d <= weekEnd) weekPayables += e.amount ?? 0;
      if (d < today) {
        overduePay++;
        overduePayAmt += e.amount ?? 0;
      }
    }
  }
  const net = monthInflow - monthOutflow;

  const days: Array<{ date: Date; inflow: number; outflow: number }> = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push({ date: d, inflow: 0, outflow: 0 });
  }
  for (const r of receivables) {
    if (r.status !== 'planned' || !r.due_date) continue;
    const d = days.find((x) => ymd(x.date) === r.due_date);
    if (d) d.inflow += r.amount ?? 0;
  }
  for (const e of payables) {
    if (e.status !== 'planned' || !e.due_date) continue;
    const d = days.find((x) => ymd(x.date) === e.due_date);
    if (d) d.outflow += e.amount ?? 0;
  }
  const maxDay = Math.max(...days.map((d) => Math.max(d.inflow, d.outflow)), 1);

  const upcoming = [...receivables, ...payables]
    .filter((e) => e.status === 'planned' && e.due_date)
    .filter((e) => {
      const d = new Date(e.due_date!);
      return d <= twoWeekEnd;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 12);

  const entityLabel = (e: Entry) => {
    if (e.kind === 'revenue') {
      return (
        e.client_name ?? e.contracts?.client_company ?? e.contracts?.client_name ?? '-'
      );
    }
    return (
      e.payee?.name ??
      e.partners?.display_name ??
      e.partners?.name_ko ??
      '-'
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">재무 대시보드</h1>
        <p className="text-white/40 text-xs mt-1">
          {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준
        </p>
      </div>

      {/* Primary KPI row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="p-5 rounded-xl border border-brand/30 bg-brand/[0.08]">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
            <TrendingUp size={14} className="text-brand" />
            이번 달 순현금흐름
          </div>
          <div className={`text-3xl font-black ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {net >= 0 ? '+' : '−'}
            {fmt(Math.abs(net))}
            <span className="text-lg text-white/50 font-bold">원</span>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-white/60">수금</span>
              <span className="text-green-400 font-semibold">+{fmt(monthInflow)}원</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-white/60">지급</span>
              <span className="text-red-400 font-semibold">−{fmt(monthOutflow)}원</span>
            </span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
            <ArrowDownLeft size={14} className="text-green-400" />
            이번 주 수금 예정
          </div>
          <div className="text-2xl font-black text-white">
            {fmt(weekReceivables)}
            <span className="text-base text-white/50 font-bold">원</span>
          </div>
          <p className="text-white/40 text-xs mt-2">
            ~{weekEnd.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
            <ArrowUpRight size={14} className="text-red-400" />
            이번 주 지급 예정
          </div>
          <div className="text-2xl font-black text-white">
            {fmt(weekPayables)}
            <span className="text-base text-white/50 font-bold">원</span>
          </div>
          <p className="text-white/40 text-xs mt-2">
            ~{weekEnd.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Overdue + Cashflow chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
            <AlertTriangle size={14} className="text-red-400" />
            연체 / 임박
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-white/60 text-xs">수금</span>
              <span className={overdueRec > 0 ? 'text-red-400' : 'text-white/40'}>
                <span className="text-lg font-bold">{overdueRec}</span>
                <span className="text-xs ml-1">건 · {fmt(overdueRecAmt)}원</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-white/60 text-xs">지급</span>
              <span className={overduePay > 0 ? 'text-red-400' : 'text-white/40'}>
                <span className="text-lg font-bold">{overduePay}</span>
                <span className="text-xs ml-1">건 · {fmt(overduePayAmt)}원</span>
              </span>
            </div>
          </div>
        </div>

        {/* 14-day cashflow chart */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-xs">14일 현금흐름 미리보기</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-white/50">
                <span className="w-2 h-2 rounded-sm bg-green-400/70" />수금
              </span>
              <span className="flex items-center gap-1.5 text-white/50">
                <span className="w-2 h-2 rounded-sm bg-red-400/70" />지급
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-28">
            {days.map((d, i) => {
              const inH = (d.inflow / maxDay) * 100;
              const outH = (d.outflow / maxDay) * 100;
              const weekend = d.date.getDay() === 0 || d.date.getDay() === 6;
              return (
                <div
                  key={i}
                  className={`flex-1 flex flex-col items-center gap-[2px] ${weekend ? 'opacity-40' : ''}`}
                  title={`${ymd(d.date)} 수금 ${fmt(d.inflow)}원 / 지급 ${fmt(d.outflow)}원`}
                >
                  <div
                    className="w-full bg-green-400/70 rounded-t-sm"
                    style={{ height: `${Math.max(inH * 0.5, d.inflow > 0 ? 2 : 0)}%` }}
                  />
                  <div
                    className="w-full bg-red-400/70 rounded-b-sm"
                    style={{ height: `${Math.max(outH * 0.5, d.outflow > 0 ? 2 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-2">
            {days.map((d, i) => (
              <div
                key={i}
                className="flex-1 text-center text-[10px] text-white/30 font-mono"
              >
                {d.date.getDate()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming combined table */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold">다가오는 수금 · 지급</h2>
          <p className="text-white/40 text-xs mt-0.5">2주 이내 예정된 건</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/finance/receivables"
            className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs rounded transition-colors"
          >
            수금 전체
          </Link>
          <Link
            href="/admin/finance/payables"
            className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs rounded transition-colors"
          >
            지급 전체
          </Link>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center py-12 text-white/30 border border-white/10 rounded-xl">
          2주 이내 예정된 건이 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10">
                {['예정일', '유형', '프로젝트', '거래처 / 수신자', '항목', '공급가액', '상태', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-white/40 text-xs font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e) => {
                const due = new Date(e.due_date!);
                const days = Math.round((due.getTime() - today.getTime()) / 86400000);
                const overdue = days < 0;
                const isRevenue = e.kind === 'revenue';
                const detailUrl = isRevenue
                  ? `/admin/finance/receivables/${e.id}`
                  : `/admin/finance/payables/${e.id}`;
                return (
                  <tr key={`${e.kind}:${e.id}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className={`text-xs font-mono ${overdue ? 'text-red-400' : 'text-white/80'}`}>
                        {due.toLocaleDateString('ko-KR')}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {overdue ? `${-days}일 연체` : days === 0 ? '오늘' : `D−${days}`}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isRevenue
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {isRevenue ? '수금' : '지급'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white/80 text-sm">{e.projects?.name ?? '-'}</td>
                    <td className="px-3 py-3 text-white text-sm">{entityLabel(e)}</td>
                    <td className="px-3 py-3 text-white/70 text-sm">{e.name ?? '-'}</td>
                    <td className="px-3 py-3 text-white/80 text-sm whitespace-nowrap">
                      {fmt(e.amount ?? 0)}원
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          overdue
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {overdue ? '연체' : FINANCIAL_STATUS_LABELS[e.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={detailUrl} className="text-brand text-xs hover:underline">
                        상세
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
