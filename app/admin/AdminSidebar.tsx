'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, MessageSquare, FileText, Film, FileSignature, Users, LogOut, Wallet, UserPlus } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import Image from 'next/image';
import type { AdminRole, AdminUser } from '@/lib/admin-auth';

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: AdminRole[];
  headOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: '/admin', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/inquiries', icon: MessageSquare, label: '문의 관리' },
  { href: '/admin/contracts', icon: FileSignature, label: '견적 관리' },
  { href: '/admin/agreements', icon: FileText, label: '계약 관리' },
  { href: '/admin/payments', icon: Wallet, label: '지급 관리', headOnly: true },
  { href: '/admin/portfolio', icon: Film, label: '포트폴리오' },
  { href: '/admin/clients', icon: Users, label: '클라이언트' },
  { href: '/admin/signup-requests', icon: UserPlus, label: '회원가입 신청', headOnly: true },
  // { href: '/admin/account', icon: KeyRound, label: '비밀번호 변경' },
];

export default function AdminSidebar({ user }: { user: AdminUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const visible = navItems.filter((i) => {
    if (i.headOnly && user.bu_code !== 'HEAD') return false;
    if (i.roles && !i.roles.includes(user.role)) return false;
    return true;
  });

  return (
    <aside className="w-56 flex-shrink-0 bg-black border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Image src="/logo.svg" alt="React Studio" width={130} height={26} />
        <p className="text-white/30 text-xs mt-1">관리자</p>
      </div>

      {/* User */}
      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-white text-sm font-medium truncate">{user.name}</p>
        <p className="text-white/40 text-xs mt-0.5">{user.role}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {visible.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                active
                  ? 'bg-brand text-white font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors w-full"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
