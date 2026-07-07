'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Building2,
  CalendarCheck,
  Download,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  User,
} from 'lucide-react';
import {
  STAFF_APPLICANT_TYPES,
  STAFF_CAPABILITY_OPTIONS,
  STAFF_STATUS_OPTIONS,
  applicantTypeLabel,
  capabilityShortLabel,
  experienceLevelLabel,
  proficiencyLabel,
  rateUnitLabel,
  skillGroupLabel,
  type StaffApplicationRow,
  type StaffStatus,
} from '@/lib/staff-pool';
import {
  availabilityScheduleLabel,
  availabilityStatusLabel,
  STAFF_AVAILABILITY_STATUSES,
  type StaffAvailabilityPollRow,
} from '@/lib/staff-availability';

type SortKey = 'newest' | 'rating' | 'name' | 'rate_low';
type StatusFilter = 'all' | StaffStatus;
type ApplicantTypeFilter = 'all' | StaffApplicationRow['applicant_type'];

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR');
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return '협의';
  return value.toLocaleString('ko-KR') + '원';
}

function minRate(row: StaffApplicationRow) {
  const values = row.rate_cards
    .map((rate) => rate.min_amount ?? rate.max_amount)
    .filter((value): value is number => typeof value === 'number');
  return values.length ? Math.min(...values) : Number.POSITIVE_INFINITY;
}

function latestPoll(row: StaffApplicationRow) {
  return [...row.availability_polls].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0] ?? null;
}

function pollStatusTone(status: string) {
  return STAFF_AVAILABILITY_STATUSES.find((item) => item.value === status)?.tone ?? 'border-white/10 text-white/45';
}

function searchable(row: StaffApplicationRow) {
  return [
    row.display_name,
    row.legal_name,
    row.company_name,
    row.contact_name,
    row.phone,
    row.email,
    row.region,
    row.summary,
    row.availability,
    row.equipment_detail,
    ...row.tools,
    ...row.ai_tools,
    ...row.equipment,
    ...row.preferred_project_types,
    ...row.capability_tags,
    ...row.capabilities.flatMap((cap) => [cap.category, cap.role_detail, cap.notes, ...cap.tools, ...cap.equipment]),
    ...row.skill_entries.flatMap((skill) => [
      skill.skill_group,
      skill.skill_name,
      skill.role_detail,
      skill.notes,
      ...skill.tools,
      ...skill.equipment,
    ]),
    ...row.rate_cards.flatMap((rate) => [rate.skill_group, rate.skill_name, rate.notes]),
    ...row.availability_polls.flatMap((poll) => [
      poll.response_status,
      poll.preferred_time,
      poll.rate_note,
      poll.equipment_note,
      poll.message,
      ...poll.available_days,
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function StatusBadge({ status }: { status: StaffStatus }) {
  const option = STAFF_STATUS_OPTIONS.find((item) => item.value === status);
  return (
    <span className={cls('inline-flex rounded border px-2 py-0.5 text-[11px] font-bold', option?.className)}>
      {option?.label ?? status}
    </span>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/65">
      {children}
    </span>
  );
}

export default function StaffPoolClient({ initialRows }: { initialRows: StaffApplicationRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [selectedId, setSelectedId] = useState<number | null>(initialRows[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ApplicantTypeFilter>('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [rows]);

  const skillOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      row.skill_entries.forEach((skill) => set.add(skill.skill_name));
      row.capabilities.forEach((cap) => set.add(cap.category));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        if (typeFilter !== 'all' && row.applicant_type !== typeFilter) return false;
        if (skillFilter !== 'all') {
          const hasSkill =
            row.capabilities.some((cap) => cap.category === skillFilter) ||
            row.skill_entries.some((skill) => skill.skill_name === skillFilter || skill.skill_group === skillFilter);
          if (!hasSkill) return false;
        }
        if (!q) return true;
        return searchable(row).includes(q);
      })
      .sort((a, b) => {
        if (sort === 'rating') return (b.admin_rating ?? 0) - (a.admin_rating ?? 0);
        if (sort === 'name') return a.display_name.localeCompare(b.display_name);
        if (sort === 'rate_low') return minRate(a) - minRate(b);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [rows, query, statusFilter, typeFilter, skillFilter, sort]);

  async function patchApplication(id: number, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff-pool/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '변경에 실패했습니다.');
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                ...patch,
              }
            : row
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : '변경에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!selected || !noteText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff-pool/${selected.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '메모 저장에 실패했습니다.');
      setRows((prev) =>
        prev.map((row) =>
          row.id === selected.id
            ? { ...row, notes: [result.note, ...row.notes] }
            : row
        )
      );
      setNoteText('');
    } catch (error) {
      alert(error instanceof Error ? error.message : '메모 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function openFile(fileId: number) {
    if (!selected) return;
    const res = await fetch(`/api/admin/staff-pool/${selected.id}/files/${fileId}/signed-url`, {
      method: 'POST',
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.url) {
      alert(result.error ?? '파일 URL 생성에 실패했습니다.');
      return;
    }
    window.open(result.url, '_blank', 'noopener,noreferrer');
  }

  async function convertToPartner() {
    if (!selected || selected.partner_id) return;
    if (!confirm(`${selected.display_name} 지원자를 REACT 파트너로 전환할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/staff-pool/${selected.id}/convert`, {
        method: 'POST',
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '파트너 전환에 실패했습니다.');
      setRows((prev) =>
        prev.map((row) =>
          row.id === selected.id
            ? {
                ...row,
                status: 'approved',
                partner_id: result.partner_id,
                partner_name: result.partner_name ?? row.display_name,
              }
            : row
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : '파트너 전환에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">REACT Staff Pool</p>
          <h1 className="mt-1 text-2xl font-black text-white">스탭풀 관리</h1>
          <p className="mt-1 text-xs text-white/40">
            전체 {counts.total ?? 0}명 · 신규 {counts.new ?? 0}명 · 후보 {counts.shortlisted ?? 0}명 · 승인 {counts.approved ?? 0}명
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/staff/apply"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded bg-white px-3 py-2 text-xs font-black text-black transition hover:bg-brand hover:text-white"
          >
            지원 페이지 열기 <ExternalLink size={14} />
          </a>
          <a
            href="/admin/staff-pool/availability"
            className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-xs font-black text-white/65 transition hover:border-brand hover:text-brand"
          >
            가능 여부 현황 <CalendarCheck size={14} />
          </a>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_0.8fr]">
        <label className="flex h-10 items-center gap-2 rounded border border-white/10 bg-black px-3">
          <Search size={15} className="text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 툴, 장비, 스킬 검색"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-10 rounded border border-white/10 bg-black px-3 text-sm text-white"
        >
          <option value="all">전체 상태</option>
          {STAFF_STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ApplicantTypeFilter)}
          className="h-10 rounded border border-white/10 bg-black px-3 text-sm text-white"
        >
          <option value="all">전체 유형</option>
          {STAFF_APPLICANT_TYPES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="h-10 rounded border border-white/10 bg-black px-3 text-sm text-white"
        >
          <option value="all">전체 스킬</option>
          {STAFF_CAPABILITY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
          {skillOptions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded border border-white/10 bg-black px-3 text-sm text-white"
        >
          <option value="newest">최신순</option>
          <option value="rating">평점순</option>
          <option value="name">이름순</option>
          <option value="rate_low">낮은 단가순</option>
        </select>
      </div>

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[0.95fr_1.35fr]">
        <div className="overflow-hidden rounded-md border border-white/10">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
            <span>Applicant</span>
            <span>Skills</span>
            <span className="inline-flex items-center gap-1">Sort <ArrowUpDown size={12} /></span>
          </div>
          <div className="max-h-[720px] divide-y divide-white/5 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-white/35">조건에 맞는 지원자가 없습니다.</div>
            ) : (
              filtered.map((row) => {
                const active = selected?.id === row.id;
                const poll = latestPoll(row);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={cls(
                      'grid w-full grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 text-left transition',
                      active ? 'bg-brand/10' : 'hover:bg-white/[0.035]'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="mb-1 flex items-center gap-2">
                        {row.applicant_type === 'individual' ? (
                          <User size={14} className="text-white/35" />
                        ) : (
                          <Building2 size={14} className="text-white/35" />
                        )}
                        <span className="truncate text-sm font-bold text-white">{row.display_name}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={row.status} />
                        <span className="text-[11px] text-white/35">{applicantTypeLabel(row.applicant_type)}</span>
                        {poll && (
                          <span className={cls('rounded border px-1.5 py-0.5 text-[11px] font-bold', pollStatusTone(poll.response_status))}>
                            {availabilityStatusLabel(poll.response_status)}
                          </span>
                        )}
                        {row.admin_rating && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-200">
                            <Star size={11} fill="currentColor" /> {row.admin_rating}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex max-w-44 flex-wrap justify-end gap-1">
                      {row.capabilities.slice(0, 2).map((cap) => (
                        <Chip key={cap.id}>{capabilityShortLabel(cap.category)}</Chip>
                      ))}
                      {row.skill_entries.slice(0, 2).map((skill) => (
                        <Chip key={skill.id}>{skill.skill_name}</Chip>
                      ))}
                    </span>
                    <span className="text-right text-[11px] text-white/35">
                      {formatDate(row.created_at)}
                      <br />
                      {minRate(row) === Number.POSITIVE_INFINITY ? '단가 미기재' : formatMoney(minRate(row))}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-[#080808]">
          {!selected ? (
            <div className="p-12 text-center text-sm text-white/35">지원자를 선택해 주세요.</div>
          ) : (
            <div className="space-y-6 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={selected.status} />
                    <span className="rounded border border-white/10 px-2 py-0.5 text-[11px] text-white/45">
                      {applicantTypeLabel(selected.applicant_type)}
                    </span>
                    {selected.partner_id && (
                      <span className="rounded border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[11px] font-bold text-emerald-100">
                        파트너 연결됨
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-white">{selected.display_name}</h2>
                  <p className="mt-1 text-sm text-white/40">
                    {selected.region || '지역 미기재'} · {formatDate(selected.created_at)} 접수
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selected.status}
                    disabled={busy}
                    onChange={(e) => patchApplication(selected.id, { status: e.target.value })}
                    className="h-9 rounded border border-white/10 bg-black px-2 text-xs text-white"
                  >
                    {STAFF_STATUS_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <select
                    value={selected.admin_rating ?? ''}
                    disabled={busy}
                    onChange={(e) =>
                      patchApplication(selected.id, {
                        admin_rating: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="h-9 rounded border border-white/10 bg-black px-2 text-xs text-white"
                  >
                    <option value="">평점 없음</option>
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>{value}점</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !!selected.partner_id}
                    onClick={convertToPartner}
                    className="h-9 rounded bg-brand px-3 text-xs font-black text-white transition hover:bg-[#ff6a2b] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    파트너 전환
                  </button>
                </div>
              </div>

              <section className="grid gap-3 md:grid-cols-2">
                <Info icon={<Mail size={14} />} label="이메일" value={selected.email} />
                <Info icon={<Phone size={14} />} label="연락처" value={selected.phone} />
                <Info label="법적명/본명" value={selected.legal_name ?? '-'} />
                <Info label="사업자번호" value={selected.business_registration_number ?? '-'} />
                <Info label="개업연월" value={formatDate(selected.opened_on)} />
                <Info label="생년월일" value={formatDate(selected.birth_date)} />
              </section>

              {selected.summary && (
                <section>
                  <h3 className="mb-2 text-sm font-black text-white">소개와 협업 범위</h3>
                  <p className="whitespace-pre-wrap rounded-md border border-white/10 bg-white/[0.025] p-4 text-sm leading-relaxed text-white/65">
                    {selected.summary}
                  </p>
                </section>
              )}

              <Panel title="댄스학원 고정건 응답">
                {selected.availability_polls.length === 0 ? (
                  <div className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-sm text-white/35">아직 연결된 가능 여부 응답이 없습니다.</p>
                    <a
                      href="/admin/staff-pool/availability"
                      className="shrink-0 rounded border border-white/10 px-3 py-2 text-xs font-bold text-white/55 transition hover:border-brand hover:text-brand"
                    >
                      전체 현황
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.availability_polls.map((poll) => (
                      <AvailabilityPollCard key={poll.id} poll={poll} />
                    ))}
                  </div>
                )}
              </Panel>

              <section className="grid gap-4 lg:grid-cols-2">
                <Panel title="대분류 역량">
                  <div className="space-y-2">
                    {selected.capabilities.length === 0 ? (
                      <Empty />
                    ) : (
                      selected.capabilities.map((cap) => (
                        <div key={cap.id} className="rounded border border-white/10 bg-white/[0.025] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-white">{capabilityShortLabel(cap.category)}</span>
                            <span className="text-xs text-white/40">{proficiencyLabel(cap.proficiency)}</span>
                          </div>
                          {cap.role_detail && <p className="mt-2 text-xs leading-relaxed text-white/55">{cap.role_detail}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </Panel>

                <Panel title="단가 카드">
                  <div className="space-y-2">
                    {selected.rate_cards.length === 0 ? (
                      <Empty />
                    ) : (
                      selected.rate_cards.map((rate) => (
                        <div key={rate.id} className="rounded border border-white/10 bg-white/[0.025] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-white">
                                {skillGroupLabel(rate.skill_group)}
                                {rate.skill_name ? ` · ${rate.skill_name}` : ''}
                              </p>
                              <p className="mt-1 text-xs text-white/40">
                                {rateUnitLabel(rate.rate_unit)} · 장비 {rate.includes_equipment ? '포함' : '별도'} · {rate.is_negotiable ? '협의 가능' : '고정'}
                              </p>
                            </div>
                            <p className="text-right text-sm font-black text-brand">
                              {formatMoney(rate.min_amount)}
                              {rate.max_amount ? `~${formatMoney(rate.max_amount)}` : ''}
                            </p>
                          </div>
                          {rate.notes && <p className="mt-2 text-xs leading-relaxed text-white/50">{rate.notes}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </section>

              <Panel title="세부 스킬과 경력">
                <div className="grid gap-2 md:grid-cols-2">
                  {selected.skill_entries.length === 0 ? (
                    <Empty />
                  ) : (
                    selected.skill_entries.map((skill) => (
                      <div key={skill.id} className="rounded border border-white/10 bg-white/[0.025] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-white">{skill.skill_name}</p>
                            <p className="mt-1 text-xs text-white/40">
                              {skillGroupLabel(skill.skill_group)} · {experienceLevelLabel(skill.experience_level)}
                              {skill.years_experience ? ` · ${skill.years_experience}년` : ''}
                            </p>
                          </div>
                          {skill.representative_work_url && (
                            <a
                              href={skill.representative_work_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand hover:text-white"
                              aria-label="대표작 열기"
                            >
                              <ExternalLink size={15} />
                            </a>
                          )}
                        </div>
                        {skill.role_detail && <p className="mt-2 text-xs leading-relaxed text-white/55">{skill.role_detail}</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[...skill.tools, ...skill.equipment].slice(0, 8).map((tag) => (
                            <Chip key={tag}>{tag}</Chip>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <section className="grid gap-4 lg:grid-cols-2">
                <Panel title="툴과 장비">
                  <TagBlock title="툴" values={selected.tools} />
                  <TagBlock title="AI" values={selected.ai_tools} />
                  {selected.equipment_detail && (
                    <div className="mb-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
                        보유 장비 현황
                      </p>
                      <p className="whitespace-pre-wrap rounded border border-white/10 bg-black/30 p-3 text-sm leading-relaxed text-white/65">
                        {selected.equipment_detail}
                      </p>
                    </div>
                  )}
                  <TagBlock title="장비 태그" values={selected.equipment} />
                </Panel>
                <Panel title="링크와 파일">
                  <LinkBlock title="포트폴리오" values={selected.portfolio_urls} />
                  <LinkBlock title="SNS/채널" values={selected.social_links} />
                  <div className="mt-4 space-y-2">
                    {selected.files.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => openFile(file.id)}
                        className="flex w-full items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.025] px-3 py-2 text-left text-xs text-white/65 transition hover:border-brand/40 hover:text-white"
                      >
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <FileText size={14} className="shrink-0 text-white/35" />
                          <span className="truncate">{file.file_name}</span>
                        </span>
                        <Download size={14} className="shrink-0" />
                      </button>
                    ))}
                    {selected.files.length === 0 && <Empty />}
                  </div>
                </Panel>
              </section>

              <Panel title="관리자 메모">
                <div className="flex gap-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    placeholder="섭외 가능성, 견적감, 통화 내용, 주의사항"
                    className="min-h-20 flex-1 rounded border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand/60"
                  />
                  <button
                    type="button"
                    disabled={busy || !noteText.trim()}
                    onClick={addNote}
                    className="inline-flex w-24 items-center justify-center gap-1 rounded bg-white text-xs font-black text-black transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={14} /> 추가
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {selected.notes.map((note) => (
                    <div key={note.id} className="rounded border border-white/10 bg-white/[0.025] p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{note.note}</p>
                      <p className="mt-2 text-[11px] text-white/30">
                        {note.author_name ?? '관리자'} · {formatDate(note.created_at)}
                      </p>
                    </div>
                  ))}
                  {selected.notes.length === 0 && <Empty />}
                </div>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.025] p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">
        {icon}
        {label}
      </p>
      <p className="break-all text-sm text-white/70">{value || '-'}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.018] p-4">
      <h3 className="mb-3 text-sm font-black text-white">{title}</h3>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-white/30">기록이 없습니다.</p>;
}

function AvailabilityPollCard({ poll }: { poll: StaffAvailabilityPollRow }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.025] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className={cls('inline-flex rounded border px-2 py-1 text-xs font-bold', pollStatusTone(poll.response_status))}>
            {availabilityStatusLabel(poll.response_status)}
          </span>
          <p className="mt-2 text-xs text-white/40">
            {poll.submitted_at ? `${formatDate(poll.submitted_at)} 응답` : '아직 미응답'}
          </p>
        </div>
        <a
          href={`/staff/availability/${poll.token}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs font-bold text-white/50 transition hover:border-brand hover:text-brand"
        >
          링크 <ExternalLink size={12} />
        </a>
      </div>
      <div className="mt-3 grid gap-1 text-xs leading-relaxed text-white/55 sm:grid-cols-2">
        <p>일정: {availabilityScheduleLabel(poll)}</p>
        <p>금액: {poll.rate_note || '-'}</p>
        <p>장비: {poll.equipment_note || '-'}</p>
      </div>
      {poll.message && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-white/55">{poll.message}</p>}
    </div>
  );
}

function TagBlock({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="mb-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Chip key={value}>{value}</Chip>
        ))}
      </div>
    </div>
  );
}

function LinkBlock({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="mb-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">{title}</p>
      <div className="space-y-1">
        {values.map((value) => (
          <a
            key={value}
            href={value}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 break-all text-xs text-brand transition hover:text-white"
          >
            <ExternalLink size={12} />
            {value}
          </a>
        ))}
      </div>
    </div>
  );
}
