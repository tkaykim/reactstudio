'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

const ALLOWED_BU_CODES = ['REACT', 'HEAD'];
const ALLOWED_ROLES = ['admin', 'leader', 'manager'];

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      setError('관리자 권한이 없습니다. 담당자에게 문의하세요.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('bu_code, role, status')
      .eq('id', authData.user.id)
      .single();

    if (
      !appUser ||
      appUser.status !== 'active' ||
      !ALLOWED_BU_CODES.includes(appUser.bu_code) ||
      !ALLOWED_ROLES.includes(appUser.role)
    ) {
      await supabase.auth.signOut();
      setError('관리자 권한이 없습니다. 담당자에게 문의하세요.');
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="React Studio" width={160} height={32} className="mx-auto mb-2" />
          <p className="text-white/30 text-sm">관리자 로그인</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="text-white/50 text-sm mb-1.5 block">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand text-white font-semibold rounded hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> 로그인 중...</> : '로그인'}
          </button>

          <p className="text-center text-white/40 text-xs">
            계정이 없나요?{' '}
            <Link href="/admin/signup" className="text-brand hover:underline">
              회원가입 신청
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
