import { redirect } from 'next/navigation';
import { requireAdmin, canManagePayments } from '@/lib/admin-auth';
import FinanceTabs from './FinanceTabs';

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');

  return (
    <div>
      <FinanceTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
