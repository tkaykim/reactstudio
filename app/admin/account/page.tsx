'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function AccountPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pw.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.');
    if (pw !== pw2) return setError('비밀번호가 일치하지 않습니다.');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        setError(error.message);
        return;
      }
      setDone(true);
      setPw('');
      setPw2('');
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
        <KeyRound size={22} className="text-brand" />
        비밀번호 변경
      </h1>

      {done && (
        <div className="mb-4 p-3 rounded border border-green-500/30 bg-green-500/10 flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle size={16} />
          비밀번호가 변경되었습니다.
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-white/50 text-sm mb-1.5 block">새 비밀번호 (8자 이상)</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              minLength={8}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-white/50 text-sm mb-1.5 block">새 비밀번호 확인</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            minLength={8}
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !pw || !pw2}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          변경하기
        </button>
      </form>
    </div>
  );
}
