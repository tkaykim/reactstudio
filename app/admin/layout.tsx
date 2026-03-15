import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import AdminSidebar from './AdminSidebar';

const ALLOWED_BU_CODES = ['REACT', 'HEAD'];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const { data: appUser } = await supabase
    .from('app_users')
    .select('bu_code')
    .eq('id', user.id)
    .single();

  if (!appUser || !ALLOWED_BU_CODES.includes(appUser.bu_code)) {
    await supabase.auth.signOut();
    redirect('/admin/login?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-[#080808] flex">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
