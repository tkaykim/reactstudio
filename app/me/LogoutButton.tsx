'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-white text-xs transition-colors"
    >
      <LogOut size={14} />
      로그아웃
    </button>
  );
}
