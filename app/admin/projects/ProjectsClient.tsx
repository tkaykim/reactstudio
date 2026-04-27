'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Calendar } from 'lucide-react';
import { formatProjectCode, PROJECT_STATUS_COLOR, type ProjectStatus } from '@/lib/project-categories';

export type ProjectRow = {
  id: number;
  name: string;
  status: ProjectStatus;
  end_date: string | null;
  pm_name: string | null;
  member_names: string[];
  partner_name: string | null;
  progress: number;
  task_total: number;
  task_done: number;
};

type StatusBucket = 'active' | 'on_hold' | 'done' | 'all';

const ACTIVE_STATUSES: ProjectStatus[] = ['준비중', '기획중', '진행중', '운영중'];

const BUCKET_OPTIONS: { value: StatusBucket; label: string }[] = [
  { value: 'active', label: '활성' },
  { value: 'on_hold', label: '보류' },
  { value: 'done', label: '완료' },
  { value: 'all', label: '전체' },
];

function fmtDate(d: string | null) {
  if (!d) return '-';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}.${m[3]}` : d;
}

function bucketOf(s: ProjectStatus): Exclude<StatusBucket, 'all'> {
  if (s === '완료') return 'done';
  if (s === '보류') return 'on_hold';
  return 'active';
}

const AVATAR_PALETTE = [
  'bg-brand/30 text-brand',
  'bg-blue-500/30 text-blue-200',
  'bg-green-500/30 text-green-200',
  'bg-purple-500/30 text-purple-200',
  'bg-pink-500/30 text-pink-200',
  'bg-amber-500/30 text-amber-200',
  'bg-cyan-500/30 text-cyan-200',
  'bg-rose-500/30 text-rose-200',
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function initialOf(name: string) {
  const t = name.trim();
  if (!t) return '?';
  // 한글: 첫 글자, 영문: 첫 글자 대문자
  return t.slice(0, 1);
}

function MemberAvatars({ pmName, members }: { pmName: string | null; members: string[] }) {
  const list: { name: string; isPM: boolean }[] = [];
  if (pmName) list.push({ name: pmName, isPM: true });
  for (const m of members) list.push({ name: m, isPM: false });

  const VISIBLE = 3;
  const shown = list.slice(0, VISIBLE);
  const overflow = list.length - shown.length;

  const tooltip = list.map((p) => (p.isPM ? `${p.name} (PM)` : p.name)).join(', ') || '-';

  return (
    <span
      className="hidden sm:inline-flex items-center flex-shrink-0 w-[88px]"
      title={tooltip}
    >
      <span className="flex -space-x-1.5">
        {shown.map((p, i) => (
          <span
            key={`${p.name}-${i}`}
            className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full ring-2 ring-[#0a0a0a] text-[10px] font-bold ${colorFor(p.name)}`}
          >
            {initialOf(p.name)}
            {p.isPM && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand ring-2 ring-[#0a0a0a]" />
            )}
          </span>
        ))}
        {overflow > 0 && (
          <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full ring-2 ring-[#0a0a0a] bg-white/10 text-white/60 text-[10px] font-bold">
            +{overflow}
          </span>
        )}
        {list.length === 0 && (
          <span className="text-white/30 text-[11px]">-</span>
        )}
      </span>
    </span>
  );
}

export default function ProjectsClient({
  initialProjects,
  isAdmin,
}: {
  initialProjects: ProjectRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState<StatusBucket>('active');

  const counts = useMemo(() => {
    const c = { active: 0, on_hold: 0, done: 0 };
    for (const p of initialProjects) c[bucketOf(p.status)]++;
    return c;
  }, [initialProjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialProjects.filter((p) => {
      if (bucket !== 'all' && bucketOf(p.status) !== bucket) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.partner_name?.toLowerCase().includes(q) ||
        p.pm_name?.toLowerCase().includes(q) ||
        p.member_names.some((n) => n.toLowerCase().includes(q)) ||
        formatProjectCode(p.id).toLowerCase().includes(q)
      );
    });
  }, [initialProjects, query, bucket]);

  return (
    <div>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Projects</h1>
          <p className="text-white/40 text-xs mt-1">
            활성 {counts.active} · 보류 {counts.on_hold} · 완료 {counts.done} · REACT BU
            {!isAdmin && <span className="ml-2 text-white/30">· 내 프로젝트만</span>}
          </p>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search anything..."
          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 w-64"
        />
      </div>

      {/* Bucket filter chips */}
      <div className="flex gap-2 mb-3">
        {BUCKET_OPTIONS.map((opt) => {
          const total =
            opt.value === 'all'
              ? counts.active + counts.on_hold + counts.done
              : counts[opt.value];
          return (
            <button
              key={opt.value}
              onClick={() => setBucket(opt.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                bucket === opt.value
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {opt.label}
              <span className={`ml-1.5 text-[10px] ${bucket === opt.value ? 'text-black/50' : 'text-white/30'}`}>
                {total}
              </span>
            </button>
          );
        })}
      </div>

      {/* List rows */}
      <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-white/30 text-sm">
            {initialProjects.length === 0
              ? '진행 중인 프로젝트가 없습니다.'
              : '해당 조건의 프로젝트가 없습니다.'}
          </div>
        ) : (
          filtered.map((p) => {
            const go = () => router.push(`/admin/projects/${p.id}`);
            return (
              <div
                key={p.id}
                onClick={go}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    go();
                  }
                }}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none cursor-pointer transition-colors"
              >
                {/* ID */}
                <span className="text-white/30 text-[11px] font-mono w-12 flex-shrink-0">
                  {formatProjectCode(p.id)}
                </span>

                {/* Name + partner */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-sm font-bold truncate">{p.name}</span>
                    <span className="text-white/40 text-xs truncate">{p.partner_name ?? ''}</span>
                  </div>
                </div>

                {/* Status chip */}
                <span
                  className={`hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-medium flex-shrink-0 w-14 text-center ${
                    PROJECT_STATUS_COLOR[p.status] ?? 'bg-white/10 text-white/60'
                  }`}
                >
                  {p.status}
                </span>

                {/* Progress mini */}
                <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 w-28">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-white/50 text-[10px] font-mono w-7 text-right">{p.progress}%</span>
                </div>

                {/* Due */}
                <span className="hidden sm:inline-flex items-center gap-1 text-white/50 text-[11px] font-mono flex-shrink-0 w-16">
                  <Calendar size={11} className="text-white/30" />
                  {fmtDate(p.end_date)}
                </span>

                {/* Members (PM + participants) — avatar group with overflow */}
                <MemberAvatars pmName={p.pm_name} members={p.member_names} />

                <ChevronRight size={14} className="text-white/30 flex-shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
