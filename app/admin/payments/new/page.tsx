import { redirect } from 'next/navigation';
import { requireAdmin, canManagePayments } from '@/lib/admin-auth';
import PaymentForm from '../PaymentForm';

export default async function NewPaymentPage() {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');
  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6">새 지급 등록</h1>
      <PaymentForm mode="create" defaultBuCode={user.bu_code} />
    </div>
  );
}
