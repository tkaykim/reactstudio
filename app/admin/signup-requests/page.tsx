import { redirect } from 'next/navigation';
import { requireAdmin, canManageSignups } from '@/lib/admin-auth';
import SignupRequestsClient from './SignupRequestsClient';

export default async function SignupRequestsPage() {
  const user = await requireAdmin();
  if (!canManageSignups(user)) {
    redirect('/admin');
  }
  return <SignupRequestsClient />;
}
