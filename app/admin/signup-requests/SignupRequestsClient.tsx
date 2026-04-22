'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check, X, UserPlus } from 'lucide-react';
import type { BuCode } from '@/types';

type SignupRequest = {
  id: string;
  name: string;
  email: string;
  requested_bu_code: BuCode | null;
  signup_message: string | null;
  signup_requested_at: string | null;
  status: string;
  created_at: string;
};

const ADMIN_BU: BuCode = 'REACT';
const ROLES = ['member', 'manager', 'leader', 'admin', 'viewer', 'artist'] as const;

export default function SignupRequestsClient() {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, { role: string }>>({});

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/signup-requests');
    const data = await res.json();
    const list: SignupRequest[] = data.requests ?? [];
    setRequests(list);
    setDecisions((prev) => {
      const next = { ...prev };
      for (const r of list) {
        if (!next[r.id]) next[r.id] = { role: 'member' };
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    const d = decisions[id];
    if (!d) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/signup-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bu_code: ADMIN_BU, role: d.role }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? '승인 실패');
        return;
      }
      await load();
    } finally {
      setActing(null);
    }
  }

  async function reject(id: string) {
    if (!confirm('이 신청을 반려하시겠습니까?')) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/signup-requests/${id}/reject`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? '반려 실패');
        return;
      }
      await load();
    } finally {
      setActing(null);
    }
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const rejected = requests.filter((r) => r.status === 'rejected');

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
        <UserPlus size={24} className="text-brand" />
        회원가입 신청 관리
      </h1>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 size={24} className="animate-spin text-brand mx-auto" />
        </div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-white font-bold mb-3">대기 중 ({pending.length})</h2>
            {pending.length === 0 ? (
              <div className="text-center py-10 text-white/30 rounded-xl border border-white/10">
                대기 중인 신청이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => {
                  const d = decisions[r.id] ?? { role: 'member' };
                  return (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-white/10 bg-white/[0.02]"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="text-white font-medium">{r.name}</p>
                          <p className="text-white/50 text-sm">{r.email}</p>
                          <p className="text-white/30 text-xs mt-1">
                            신청일:{' '}
                            {r.signup_requested_at
                              ? new Date(r.signup_requested_at).toLocaleString('ko-KR')
                              : '-'}
                          </p>
                          {r.signup_message && (
                            <p className="mt-2 text-white/70 text-sm whitespace-pre-wrap">
                              {r.signup_message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="text-white/50 text-xs">Role</label>
                        <select
                          value={d.role}
                          onChange={(e) =>
                            setDecisions((p) => ({
                              ...p,
                              [r.id]: { ...d, role: e.target.value },
                            }))
                          }
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
                        >
                          {ROLES.map((rr) => (
                            <option key={rr} value={rr} className="bg-black">
                              {rr}
                            </option>
                          ))}
                        </select>
                        <div className="flex-1" />
                        <button
                          onClick={() => reject(r.id)}
                          disabled={acting === r.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 hover:text-red-400 hover:border-red-400/30 text-xs rounded transition-colors"
                        >
                          <X size={12} /> 반려
                        </button>
                        <button
                          onClick={() => approve(r.id)}
                          disabled={acting === r.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded hover:bg-orange-600 disabled:opacity-40 transition-colors"
                        >
                          {acting === r.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          승인
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {rejected.length > 0 && (
            <section>
              <h2 className="text-white font-bold mb-3">반려됨 ({rejected.length})</h2>
              <div className="space-y-2">
                {rejected.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-white/5 bg-white/[0.01] opacity-60"
                  >
                    <p className="text-white/70 text-sm">{r.name}</p>
                    <p className="text-white/40 text-xs">{r.email}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
