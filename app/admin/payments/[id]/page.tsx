import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin, canManagePayments, canViewAll } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import PaymentForm from '../PaymentForm';
import PaymentActions from './PaymentActions';

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  if (!canManagePayments(user)) redirect('/admin');
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  let q = supabase.from('financial_entries').select('*').eq('id', Number(id));
  if (!canViewAll(user)) q = q.eq('bu_code', user.bu_code);
  const { data } = await q.single();
  if (!data) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">지급 상세</h1>
        <Link
          href="/admin/payments"
          className="text-white/50 hover:text-white text-xs"
        >
          ← 목록
        </Link>
      </div>

      <PaymentActions
        id={data.id}
        status={data.status}
        amount={data.amount}
      />

      <div className="mt-6">
        <PaymentForm
          mode="edit"
          defaultBuCode={user.bu_code}
          initial={{
            id: data.id,
            project_id: data.project_id,
            bu_code: data.bu_code,
            category: data.category,
            name: data.name,
            amount: data.amount,
            actual_amount: data.actual_amount,
            due_date: data.due_date,
            payment_method: data.payment_method,
            partner_id: data.partner_id,
            payee_app_user_id: data.payee_app_user_id,
            share_rate: data.share_rate,
            memo: data.memo,
          }}
        />
      </div>
    </div>
  );
}
