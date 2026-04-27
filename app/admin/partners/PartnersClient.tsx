'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Mail, Phone, Building2, User } from 'lucide-react';
import PartnerModal from './PartnerModal';

export type EntityKind = 'organization' | 'person';

export type PartnerRow = {
  id: number;
  display_name: string;
  name_ko: string | null;
  name_en: string | null;
  entity_type: EntityKind;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  is_active: boolean;
  parent_partner_id: number | null;
  parent_name: string | null;
  member_count: number;
};

export type CompanyOption = { id: number; name: string };

type TabValue = 'organization' | 'person' | 'all';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'organization', label: '외주업체' },
  { value: 'person', label: '외주담당자' },
  { value: 'all', label: '전체' },
];

export default function PartnersClient({
  initialRows,
  companies,
}: {
  initialRows: PartnerRow[];
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PartnerRow[]>(initialRows);
  const [tab, setTab] = useState<TabValue>('organization');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<PartnerRow | null>(null);

  const counts = useMemo(() => {
    let org = 0, person = 0;
    for (const r of rows) {
      if (r.entity_type === 'person') person++;
      else org++;
    }
    return { org, person };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'all' && r.entity_type !== tab) return false;
      if (!q) return true;
      return (
        r.display_name.toLowerCase().includes(q) ||
        r.name_ko?.toLowerCase().includes(q) ||
        r.name_en?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.parent_name?.toLowerCase().includes(q)
      );
    });
  }, [rows, query, tab]);

  function refresh() {
    router.refresh();
  }

  async function handleCreate(payload: any) {
    const res = await fetch('/admin/partners/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '생성 실패');
      return false;
    }
    setShowCreate(false);
    refresh();
    return true;
  }

  async function handleEdit(id: number, payload: any) {
    const res = await fetch(`/admin/partners/api/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '저장 실패');
      return false;
    }
    setEditing(null);
    refresh();
    return true;
  }

  async function handleDelete(row: PartnerRow) {
    if (!confirm(`"${row.display_name}" 을(를) 비활성화 하시겠습니까?\n프로젝트에 사용 중이면 비활성화만 가능합니다.`)) return;
    const res = await fetch(`/admin/partners/api/${row.id}`, { method: 'DELETE' });
    if (res.status === 409) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '사용 중이라 삭제할 수 없습니다.');
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '삭제 실패');
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_active: false } : r)));
  }

  async function toggleActive(row: PartnerRow) {
    const res = await fetch(`/admin/partners/api/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !row.is_active }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '상태 변경 실패');
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Partners</h1>
          <p className="text-white/40 text-xs mt-1">
            외주업체 {counts.org} · 외주담당자 {counts.person} · REACT BU
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search anything..."
            className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 w-64"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-2 rounded bg-brand hover:bg-brand/90 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} /> 신규
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {TABS.map((opt) => {
          const total =
            opt.value === 'all'
              ? counts.org + counts.person
              : opt.value === 'person'
              ? counts.person
              : counts.org;
          return (
            <button
              key={opt.value}
              onClick={() => setTab(opt.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === opt.value
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {opt.label}
              <span
                className={`ml-1.5 text-[10px] ${
                  tab === opt.value ? 'text-black/50' : 'text-white/30'
                }`}
              >
                {total}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-white/30 text-sm">
            {rows.length === 0
              ? '등록된 파트너가 없습니다.'
              : '해당 조건의 파트너가 없습니다.'}
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
            >
              {/* Type icon */}
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                {r.entity_type === 'person' ? (
                  <User size={13} className="text-amber-400" />
                ) : (
                  <Building2 size={13} className="text-cyan-400" />
                )}
              </span>

              {/* Name + secondary */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-white text-sm font-bold truncate">
                    {r.display_name}
                  </span>
                  {(r.name_ko || r.name_en) && (
                    <span className="text-white/40 text-xs truncate">
                      {[r.name_ko, r.name_en].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                {r.entity_type === 'person' && r.parent_name && (
                  <p className="text-white/40 text-[11px] mt-0.5 truncate">
                    소속: <span className="text-white/60">{r.parent_name}</span>
                  </p>
                )}
                {r.entity_type !== 'person' && r.member_count > 0 && (
                  <p className="text-white/40 text-[11px] mt-0.5">
                    소속 인원 <span className="text-white/60">{r.member_count}명</span>
                  </p>
                )}
              </div>

              {/* Contact */}
              <div className="hidden md:flex flex-col items-end gap-0.5 text-[11px] text-white/50 flex-shrink-0 w-48">
                {r.phone && (
                  <span className="inline-flex items-center gap-1 truncate max-w-full">
                    <Phone size={10} className="text-white/30" />
                    {r.phone}
                  </span>
                )}
                {r.email && (
                  <span className="inline-flex items-center gap-1 truncate max-w-full">
                    <Mail size={10} className="text-white/30" />
                    {r.email}
                  </span>
                )}
              </div>

              {/* Active chip */}
              <button
                onClick={() => toggleActive(r)}
                title={r.is_active ? '클릭하여 비활성화' : '클릭하여 활성화'}
                className={`hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-medium flex-shrink-0 w-14 text-center transition-colors ${
                  r.is_active
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-white/10 text-white/40 hover:bg-white/20'
                }`}
              >
                {r.is_active ? '활성' : '비활성'}
              </button>

              <button
                onClick={() => setEditing(r)}
                className="text-white/40 hover:text-white p-1.5 rounded hover:bg-white/5"
                title="편집"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => handleDelete(r)}
                className="text-white/30 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10"
                title="삭제/비활성화"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <PartnerModal
          mode="create"
          companies={companies}
          defaultEntity={tab === 'person' ? 'person' : 'organization'}
          onClose={() => setShowCreate(false)}
          onSubmit={(payload) => handleCreate(payload)}
        />
      )}

      {editing && (
        <PartnerModal
          mode="edit"
          companies={companies}
          partner={editing}
          onClose={() => setEditing(null)}
          onSubmit={(payload) => handleEdit(editing.id, payload)}
        />
      )}
    </div>
  );
}
