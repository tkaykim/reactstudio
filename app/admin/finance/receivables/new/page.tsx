import { redirect } from 'next/navigation';
import { requireAdmin, canManagePayments } from '@/lib/admin-auth';
import ReceivableForm from '../ReceivableForm';

export default async function NewReceivablePage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');
  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6">새 수금 등록</h1>
      <ReceivableForm mode="create" />
    </div>
  );
}
