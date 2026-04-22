import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { requireAdmin, canManagePayments } from '@/lib/admin-auth';
import ReceivablesClient from './ReceivablesClient';

export default async function ReceivablesPage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">수금</h1>
          <p className="text-white/40 text-xs mt-1">고객사·클라이언트로부터 받을 금액</p>
        </div>
        <Link
          href="/admin/finance/receivables/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> 새 수금
        </Link>
      </div>
      <ReceivablesClient />
    </div>
  );
}
