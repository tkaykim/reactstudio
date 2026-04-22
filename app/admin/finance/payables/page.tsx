import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { requireAdmin, canManagePayments } from '@/lib/admin-auth';
import PayablesClient from './PayablesClient';

export default async function PayablesPage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">지급</h1>
          <p className="text-white/40 text-xs mt-1">외부 파트너·내부 직원에게 지급할 비용</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/finance/by-project"
            className="px-3 py-2 bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs rounded transition-colors"
          >
            프로젝트별
          </Link>
          <Link
            href="/admin/finance/by-person"
            className="px-3 py-2 bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs rounded transition-colors"
          >
            인원별
          </Link>
          <Link
            href="/admin/finance/payables/new"
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} /> 새 지급
          </Link>
        </div>
      </div>
      <PayablesClient />
    </div>
  );
}
