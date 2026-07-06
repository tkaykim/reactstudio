'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  FileSignature,
  FileText,
  Film,
  Handshake,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  UserPlus,
  Users,
  UserSearch,
  Wallet,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
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
  { href: '/admin/staff-pool', icon: UserSearch, label: '스탭풀' },
  { href: '/admin/projects', icon: Briefcase, label: '프로젝트' },
  { href: '/admin/partners', icon: Handshake, label: '파트너' },
  { href: '/admin/contracts', icon: FileSignature, label: '견적 관리' },
  { href: '/admin/agreements', icon: FileText, label: '계약 관리' },
  { href: '/admin/finance', icon: Wallet, label: '재무', headOnly: true },
  { href: '/admin/portfolio', icon: Film, label: '포트폴리오' },
  { href: '/admin/clients', icon: Users, label: '클라이언트' },
  { href: '/admin/signup-requests', icon: UserPlus, label: '회원가입 요청', headOnly: true },
];

export default function AdminSidebar({ user }: { user: AdminUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const visible = navItems.filter((item) => {
    if (item.headOnly && user.bu_code !== 'HEAD') return false;
    if (item.roles && !item.roles.includes(user.role)) return false;
    return true;
  });

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-white/5 bg-black">
      <div className="border-b border-white/5 p-5">
        <Image
          src="/brand/react-logo-black.png"
          alt="REACT Studio"
          width={160}
          height={32}
          className="h-auto w-32 invert"
        />
        <p className="mt-2 text-xs text-white/30">관리자</p>
      </div>

      <div className="border-b border-white/5 px-5 py-3">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="mt-0.5 text-xs text-white/40">{user.role}</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {visible.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-brand font-medium text-white'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
