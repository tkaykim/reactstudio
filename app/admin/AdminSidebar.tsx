'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  FileSignature,
  FileText,
  Film,
  Menu,
  MessagesSquare,
  Handshake,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  UserPlus,
  Users,
  UserSearch,
  Wallet,
  X,
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
  { href: '/admin/reviews', icon: MessagesSquare, label: '리뷰룸' },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

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

  const nav = (
    <>
      <div className="border-b border-white/5 px-5 py-3">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="mt-0.5 text-xs text-white/40">{user.role}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visible.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-white/5 bg-black px-4 py-3 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Image
            src="/brand/react-logo-black.png"
            alt="REACT Studio"
            width={160}
            height={32}
            className="h-auto w-24 invert"
          />
          <span className="text-xs text-white/30">관리자</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 text-white/70 transition hover:border-brand hover:text-brand"
          aria-label="메뉴 열기"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
            aria-label="메뉴 닫기"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col border-r border-white/10 bg-black">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <Image
                src="/brand/react-logo-black.png"
                alt="REACT Studio"
                width={160}
                height={32}
                className="h-auto w-28 invert"
              />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/60 transition hover:border-brand hover:text-brand"
                aria-label="메뉴 닫기"
              >
                <X size={16} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-white/5 bg-black lg:flex">
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
        {nav}
      </aside>
    </>
  );
}
