import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin, canManagePayments, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import ReceivableForm from '../ReceivableForm';
import ReceivableActions from './ReceivableActions';

export default async function ReceivableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('financial_entries')
    .select('*')
    .eq('id', Number(id))
    .eq('kind', 'revenue')
    .eq('bu_code', ADMIN_BU)
    .single();
  if (!data) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">수금 상세</h1>
        <Link
          href="/admin/finance/receivables"
          className="text-white/50 hover:text-white text-xs"
        >
          ← 목록
        </Link>
      </div>

      <ReceivableActions id={data.id} status={data.status} amount={data.amount} />

      <div className="mt-6">
        <ReceivableForm
          mode="edit"
          initial={{
            id: data.id,
            project_id: data.project_id,
            contract_id: data.contract_id,
            client_name: data.client_name,
            category: data.category,
            name: data.name,
            amount: data.amount,
            actual_amount: data.actual_amount,
            due_date: data.due_date,
            payment_method: data.payment_method,
            memo: data.memo,
          }}
        />
      </div>
    </div>
  );
}
