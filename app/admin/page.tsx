import { createSupabaseServerClient } from '@/lib/supabase-server';
import { MessageSquare, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { CURRENT_BU_CODE } from '@/types';

async function getDashboardStats() {
  try {
    const supabase = await createSupabaseServerClient();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [{ count: totalNew }, { count: totalInProgress }, { count: thisMonth }, { count: totalDone }] =
      await Promise.all([
        supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('bu_code', CURRENT_BU_CODE).eq('status', 'new'),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('bu_code', CURRENT_BU_CODE).eq('status', 'in_progress'),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('bu_code', CURRENT_BU_CODE).gte('created_at', monthStart),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('bu_code', CURRENT_BU_CODE).eq('status', 'done'),
      ]);

    return { totalNew, totalInProgress, thisMonth, totalDone };
  } catch {
    return { totalNew: 0, totalInProgress: 0, thisMonth: 0, totalDone: 0 };
  }
}

async function getRecentInquiries() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('inquiries')
      .select('id, name, company, services, status, created_at')
      .eq('bu_code', CURRENT_BU_CODE)
      .order('created_at', { ascending: false })
      .limit(5);
    return data ?? [];
  } catch {
    return [];
  }
}

const statusColors: Record<string, string> = {
  new: 'bg-brand/20 text-brand',
  in_progress: 'bg-blue-500/20 text-blue-400',
  done: 'bg-green-500/20 text-green-400',
};
const statusLabels: Record<string, string> = {
  new: '신규',
  in_progress: '처리중',
  done: '완료',
};

export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  const recent = await getRecentInquiries();

  const cards = [
    { icon: MessageSquare, label: '미처리 문의', value: stats.totalNew ?? 0, color: 'text-brand' },
    { icon: Clock, label: '처리중', value: stats.totalInProgress ?? 0, color: 'text-blue-400' },
    { icon: TrendingUp, label: '이번 달 문의', value: stats.thisMonth ?? 0, color: 'text-purple-400' },
    { icon: CheckCircle, label: '완료', value: stats.totalDone ?? 0, color: 'text-green-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-8">대시보드</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
            <card.icon size={20} className={`${card.color} mb-3`} />
            <p className="text-3xl font-black text-white">{card.value}</p>
            <p className="text-white/40 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent inquiries */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">최근 문의</h2>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-white/30">문의가 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10">
                  {['이름', '회사', '서비스', '상태', '일시'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((inq: Record<string, unknown>) => (
                  <tr key={inq.id as string} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white text-sm">{inq.name as string}</td>
                    <td className="px-4 py-3 text-white/50 text-sm">{(inq.company as string) || '-'}</td>
                    <td className="px-4 py-3 text-white/50 text-sm">{(inq.services as string[]).slice(0, 2).join(', ')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[inq.status as string]}`}>
                        {statusLabels[inq.status as string]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-xs">
                      {new Date(inq.created_at as string).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
