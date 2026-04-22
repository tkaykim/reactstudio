'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import type { BuCode } from '@/types';

const BU_OPTIONS: { code: BuCode; label: string }[] = [
  { code: 'REACT', label: 'REACT' },
  { code: 'HEAD', label: 'HEAD (경영지원)' },
  { code: 'GRIGO', label: 'GRIGO' },
  { code: 'FLOW', label: 'FLOW' },
  { code: 'MODOO', label: 'MODOO' },
  { code: 'AST', label: 'AST' },
];

export default function AdminSignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [requestedBu, setRequestedBu] = useState<BuCode>('REACT');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          requested_bu_code: requestedBu,
          signup_message: message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '신청에 실패했습니다.');
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">신청이 완료되었습니다</h1>
          <p className="text-white/50 text-sm mb-6">
            관리자(HEAD) 승인 후 로그인할 수 있습니다.
          </p>
          <Link
            href="/admin/login"
            className="inline-block px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 transition-colors"
          >
            로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="React Studio" width={160} height={32} className="mx-auto mb-2" />
          <p className="text-white/30 text-sm">관리자 회원가입 신청</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">비밀번호 (8자 이상)</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
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
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">소속 BU</label>
            <select
              value={requestedBu}
              onChange={(e) => setRequestedBu(e.target.value as BuCode)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-brand transition-colors"
            >
              {BU_OPTIONS.map((o) => (
                <option key={o.code} value={o.code} className="bg-black">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">메모 (선택)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="담당 업무, 추천자 등"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand transition-colors text-sm"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand text-white font-semibold rounded hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> 신청 중...</> : '신청하기'}
          </button>

          <p className="text-center text-white/40 text-xs">
            이미 계정이 있나요?{' '}
            <Link href="/admin/login" className="text-brand hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
