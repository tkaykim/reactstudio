import Link from 'next/link';
import Image from 'next/image';
import { requireMe } from '@/lib/me-auth';
import LogoutButton from './LogoutButton';

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMe('/me/earnings');

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/me/earnings" className="flex items-center gap-3">
            <Image
              src="/brand/react-logo-black.png"
              alt="REACT Studio"
              width={150}
              height={30}
              className="h-auto w-28 invert"
            />
            <span className="text-xs text-white/30">마이페이지</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-[11px] text-white/40">{user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
