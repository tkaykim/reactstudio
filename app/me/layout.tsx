import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { requireMe } from '@/lib/me-auth';
import LogoutButton from './LogoutButton';

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMe('/me/earnings');

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/me/earnings" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="React Studio" width={110} height={22} />
            <span className="text-white/30 text-xs">마이페이지</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white text-sm font-medium">{user.name}</p>
              <p className="text-white/40 text-[11px]">{user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
