import { headers } from 'next/headers';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import AdminSidebar from './AdminSidebar';

const PUBLIC_PATHS = new Set(['/admin/login', '/admin/signup']);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const pathname =
    hdrs.get('x-invoke-path') ??
    hdrs.get('x-pathname') ??
    hdrs.get('next-url') ??
    '';
  const isPublic = PUBLIC_PATHS.has(pathname);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated login/signup render without sidebar
  if (!user) {
    return <>{children}</>;
  }

  // Allow public pages even when session exists (e.g. pending user signing out)
  if (isPublic) {
    return <>{children}</>;
  }

  const adminUser = await getAdminUser();
  if (!adminUser) {
    await requireAdmin();
    return null;
  }

  return (
    <div className="min-h-screen bg-[#080808] lg:flex">
      <AdminSidebar user={adminUser} />
      <main className="flex-1 p-4 lg:overflow-auto lg:p-6">{children}</main>
    </div>
  );
}
