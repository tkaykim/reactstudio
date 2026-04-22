'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, Users2 } from 'lucide-react';

const tabs = [
  { href: '/admin/finance', label: '대시보드', icon: LayoutDashboard, match: (p: string) => p === '/admin/finance' },
  { href: '/admin/finance/receivables', label: '수금', icon: ArrowDownLeft, match: (p: string) => p.startsWith('/admin/finance/receivables') },
  { href: '/admin/finance/payables', label: '지급', icon: ArrowUpRight, match: (p: string) => p.startsWith('/admin/finance/payables') },
  { href: '/admin/finance/by-person', label: '인원별', icon: Users2, match: (p: string) => p.startsWith('/admin/finance/by-person') || p.startsWith('/admin/finance/by-project') },
];

export default function FinanceTabs() {
  const pathname = usePathname() ?? '';
  return (
    <div className="flex items-center gap-1 border-b border-white/10">
      {tabs.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active
                ? 'text-white border-brand'
                : 'text-white/50 hover:text-white border-transparent'
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
