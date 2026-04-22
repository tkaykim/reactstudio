import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Wallet } from 'lucide-react';
import { requireAdmin, canManagePayments } from '@/lib/admin-auth';
import PaymentsClient from './PaymentsClient';

export default async function PaymentsPage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) {
    redirect('/admin');
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Wallet size={24} className="text-brand" />
          지급 관리
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/payments/by-project"
            className="px-3 py-2 bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs rounded transition-colors"
          >
            프로젝트별
          </Link>
          <Link
            href="/admin/payments/by-payee"
            className="px-3 py-2 bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs rounded transition-colors"
          >
            인원별
          </Link>
          <Link
            href="/admin/payments/new"
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} /> 새 지급
          </Link>
        </div>
      </div>
      <PaymentsClient />
    </div>
  );
}
