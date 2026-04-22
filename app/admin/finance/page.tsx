import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function FinanceDashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">재무 대시보드</h1>
        <p className="text-white/40 text-xs mt-1">수금·지급 현황 요약 (준비중)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/finance/receivables"
          className="p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
              <ArrowDownLeft size={20} />
            </div>
            <h2 className="text-white font-bold">수금</h2>
          </div>
          <p className="text-white/50 text-sm">
            고객사·클라이언트로부터 받을 금액과 수금 내역을 관리합니다.
          </p>
        </Link>

        <Link
          href="/admin/finance/payables"
          className="p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <ArrowUpRight size={20} />
            </div>
            <h2 className="text-white font-bold">지급</h2>
          </div>
          <p className="text-white/50 text-sm">
            외부 파트너·내부 직원에게 지급할 비용과 지급 내역을 관리합니다.
          </p>
        </Link>
      </div>

      <div className="mt-10 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
        <p className="text-white/50 text-sm">
          대시보드(순현금흐름, 14일 현금흐름 차트, 연체·임박 알림, 다가오는 지급·수금 통합 테이블)는
          다음 단계에서 구성됩니다.
        </p>
      </div>
    </div>
  );
}
