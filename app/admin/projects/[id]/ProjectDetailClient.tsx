'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Calendar, Pencil, Trash2 } from 'lucide-react';
import {
  TASK_CATEGORIES,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABEL,
  PROJECT_STATUS_COLOR,
  formatProjectCode,
  type TaskCategory,
  type TaskStatus,
  type ProjectStatus,
} from '@/lib/project-categories';

const PROJECT_STATUSES: ProjectStatus[] = ['준비중', '기획중', '진행중', '운영중', '보류', '완료'];

export type AssigneeOption = { id: string; name: string };
export type PartnerOption = { id: number; name: string };

export type ParticipantEntry =
  | { kind: 'user'; id: string; name: string }
  | { kind: 'partner_worker'; id: number; name: string }
  | { kind: 'partner_company'; id: number; name: string };

export type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  tag: string | null;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
};

export type ProjectDetail = {
  id: number;
  name: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  pm_id: string | null;
  pm_name: string | null;
  partner_id: number | null;
  partner_name: string | null;
  member_names: string[];
  participants: ParticipantEntry[];
};

type FilterStatus = 'all' | TaskStatus;
type FilterCategory = 'all' | TaskCategory;

function fmtDate(d: string | null) {
  if (!d) return '';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}.${m[3]}` : d;
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
  on_hold: 'todo',
};

export default function ProjectDetailClient({
  project: initialProject,
  initialTasks,
  assignees,
  partnerCompanies,
  partnerWorkers,
  isAdmin: _isAdmin,
  canEdit,
  canDelete,
}: {
  project: ProjectDetail;
  initialTasks: TaskRow[];
  assignees: AssigneeOption[];
  partnerCompanies: PartnerOption[];
  partnerWorkers: PartnerOption[];
  isAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  void _isAdmin;
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail>(initialProject);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [pending, setPending] = useState<Record<number, boolean>>({});

  const usedCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) if (t.tag) set.add(t.tag);
    return TASK_CATEGORIES.filter((c) => set.has(c));
  }, [tasks]);

  const counts = useMemo(() => {
    const c = { todo: 0, in_progress: 0, on_hold: 0, done: 0 };
    for (const t of tasks) c[t.status]++;
    return c;
  }, [tasks]);

  const total = tasks.length;
  const progress = total === 0 ? 0 : Math.round((counts.done / total) * 100);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (filterCategory !== 'all' && t.tag !== filterCategory) return false;
      return true;
    });
  }, [tasks, filter, filterCategory]);

  async function patchTask(id: number, body: Record<string, unknown>) {
    setPending((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/admin/projects/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? '저장 실패');
        return false;
      }
      return true;
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  async function cycleStatus(task: TaskRow, e: React.MouseEvent) {
    const nextStatus: TaskStatus = e.shiftKey ? 'on_hold' : NEXT_STATUS[task.status];
    const ok = await patchTask(task.id, { status: nextStatus });
    if (ok) setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
  }

  async function changeAssignee(task: TaskRow, assigneeId: string) {
    const ok = await patchTask(task.id, { assignee_id: assigneeId || null });
    if (ok) {
      const a = assignees.find((u) => u.id === assigneeId);
      setTasks((ts) =>
        ts.map((t) =>
          t.id === task.id
            ? { ...t, assignee_id: a?.id ?? null, assignee_name: a?.name ?? null }
            : t
        )
      );
    }
  }

  async function changeDate(task: TaskRow, due_date: string) {
    const ok = await patchTask(task.id, { due_date: due_date || null });
    if (ok) setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, due_date } : t)));
  }

  async function deleteTask(id: number) {
    if (!confirm('삭제하시겠습니까?')) return;
    setPending((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/admin/projects/api/tasks/${id}`, { method: 'DELETE' });
    setPending((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    if (!res.ok) {
      alert('삭제 실패');
      return;
    }
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }

  async function createTask(payload: {
    title: string;
    tag: TaskCategory | '';
    assignee_id: string;
    due_date: string;
  }) {
    const res = await fetch(`/admin/projects/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project.id,
        title: payload.title,
        tag: payload.tag || null,
        assignee_id: payload.assignee_id || null,
        due_date: payload.due_date || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '생성 실패');
      return;
    }
    const created = await res.json();
    const a = assignees.find((u) => u.id === created.assignee_id);
    setTasks((ts) => [
      ...ts,
      {
        id: created.id,
        title: created.title,
        description: created.description ?? null,
        status: created.status,
        tag: created.tag,
        due_date: created.due_date,
        assignee_id: created.assignee_id ?? null,
        assignee_name: a?.name ?? null,
      },
    ]);
    setShowCreate(false);
  }

  async function saveProject(payload: {
    name: string;
    description: string;
    status: ProjectStatus;
    start_date: string;
    end_date: string;
    pm_id: string;
    partner_id: string; // '' or number-string
    participants: ParticipantEntry[];
  }) {
    const body: Record<string, unknown> = {
      name: payload.name,
      description: payload.description || null,
      status: payload.status,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      pm_id: payload.pm_id || null,
      partner_id: payload.partner_id === '' ? null : Number(payload.partner_id),
      participants: payload.participants.map((p) => {
        if (p.kind === 'user') return { user_id: p.id, role: 'participant', is_pm: false };
        if (p.kind === 'partner_worker')
          return { partner_worker_id: p.id, role: 'participant', is_pm: false };
        return { partner_company_id: p.id, role: 'participant', is_pm: false };
      }),
    };
    const res = await fetch(`/admin/projects/api/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '저장 실패');
      return false;
    }
    // 이름/멤버 표시는 클라이언트 캐시 업데이트
    const pmAssignee = assignees.find((u) => u.id === payload.pm_id);
    const partnerCompany = partnerCompanies.find((c) => String(c.id) === payload.partner_id);
    const memberNames = payload.participants.map((p) => p.name);
    setProject({
      ...project,
      name: payload.name,
      description: payload.description || null,
      status: payload.status,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      pm_id: payload.pm_id || null,
      pm_name: pmAssignee?.name ?? null,
      partner_id: payload.partner_id === '' ? null : Number(payload.partner_id),
      partner_name: partnerCompany?.name ?? project.partner_name,
      member_names: memberNames,
      participants: payload.participants,
    });
    setShowEdit(false);
    router.refresh();
    return true;
  }

  async function deleteProject() {
    if (!confirm('프로젝트를 삭제하시겠습니까?\n연결된 모든 TO-DO도 함께 삭제됩니다.')) return;
    const res = await fetch(`/admin/projects/api/${project.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '삭제 실패');
      return;
    }
    router.push('/admin/projects');
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-xs mb-4 transition-colors"
        >
          <ArrowLeft size={12} /> PROJECTS
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white/40 text-xs font-mono mb-1">
              / {formatProjectCode(project.id)} · {project.partner_name ?? '-'}
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">{project.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-white/50 flex-wrap">
              <span>리드 <span className="text-white/80">{project.pm_name ?? '-'}</span></span>
              <span>·</span>
              <span>마감 <span className="text-white/80 font-mono">{fmtDate(project.end_date) || '-'}</span></span>
              <span>·</span>
              <span>
                단계{' '}
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    PROJECT_STATUS_COLOR[project.status] ?? 'bg-white/10 text-white/60'
                  }`}
                >
                  {project.status}
                </span>
              </span>
            </div>
            {(project.pm_name || project.member_names.length > 0) && (
              <div className="mt-2 text-xs text-white/40">
                <span className="text-white/30 mr-1.5">참여자</span>
                {project.pm_name && (
                  <span className="text-white/80 mr-2">
                    {project.pm_name}
                    <span className="ml-1 text-[9px] text-brand">PM</span>
                  </span>
                )}
                {project.member_names.length > 0 && (
                  <span className="text-white/60">{project.member_names.join(', ')}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/admin/agreements?project_id=${project.id}`}
              className="px-3 py-2 rounded border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-xs font-medium transition-colors"
            >
              계약서
            </Link>
            <Link
              href={`/admin/contracts?project_id=${project.id}`}
              className="px-3 py-2 rounded border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-xs font-medium transition-colors"
            >
              견적서
            </Link>
            {canEdit && (
              <button
                onClick={() => setShowEdit(true)}
                className="px-3 py-2 rounded border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Pencil size={12} /> 수정
              </button>
            )}
            {canDelete && (
              <button
                onClick={deleteProject}
                className="px-3 py-2 rounded border border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                title="프로젝트 삭제"
              >
                <Trash2 size={12} /> 삭제
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-2 rounded bg-brand hover:bg-brand/90 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} /> 새 TO-DO
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-white/10 p-5 mb-5 flex items-center gap-6">
        <div className="flex-1">
          <p className="text-white/40 text-xs mb-2">전체 진척도</p>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="text-3xl font-black text-white">{progress}%</div>
        <div className="flex gap-5 text-center">
          {(['todo', 'in_progress', 'on_hold', 'done'] as TaskStatus[]).map((s) => (
            <div key={s}>
              <div className="text-2xl font-black text-white">{counts[s]}</div>
              <div className="text-white/40 text-[10px] tracking-wider mt-0.5">{TASK_STATUS_LABEL[s]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs - status */}
      <div className="flex gap-2 mb-2">
        {([
          { value: 'all' as const, label: '전체' },
          ...TASK_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === opt.value
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter tabs - category (used categories only) */}
      {usedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider transition-colors ${
              filterCategory === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-white/[0.04] text-white/40 hover:bg-white/10'
            }`}
          >
            ALL
          </button>
          {usedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider transition-colors ${
                filterCategory === cat
                  ? 'bg-white/20 text-white'
                  : 'bg-white/[0.04] text-white/40 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-white/30">{tasks.length === 0 ? '아직 등록된 TO-DO가 없습니다.' : '해당 상태의 항목이 없습니다.'}</div>
        ) : (
          filtered.map((t) => (
            <TaskRowItem
              key={t.id}
              task={t}
              assignees={assignees}
              disabled={!!pending[t.id]}
              onCycleStatus={(e) => cycleStatus(t, e)}
              onChangeAssignee={(v) => changeAssignee(t, v)}
              onChangeDate={(v) => changeDate(t, v)}
              onDelete={() => deleteTask(t.id)}
            />
          ))
        )}
      </div>

      {showCreate && (
        <CreateTaskModal
          assignees={assignees}
          onClose={() => setShowCreate(false)}
          onSubmit={createTask}
        />
      )}

      {showEdit && (
        <EditProjectModal
          project={project}
          assignees={assignees}
          partnerCompanies={partnerCompanies}
          partnerWorkers={partnerWorkers}
          onClose={() => setShowEdit(false)}
          onSubmit={saveProject}
        />
      )}
    </div>
  );
}

function TaskRowItem({
  task,
  assignees,
  disabled,
  onCycleStatus,
  onChangeAssignee,
  onChangeDate,
  onDelete,
}: {
  task: TaskRow;
  assignees: AssigneeOption[];
  disabled: boolean;
  onCycleStatus: (e: React.MouseEvent) => void;
  onChangeAssignee: (v: string) => void;
  onChangeDate: (v: string) => void;
  onDelete: () => void;
}) {
  const statusOpt = TASK_STATUS_OPTIONS.find((o) => o.value === task.status);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      <button
        onClick={onCycleStatus}
        disabled={disabled}
        title="클릭: 다음 상태 / Shift+클릭: 블로커"
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.status === 'done'
            ? 'bg-green-500 border-green-500'
            : task.status === 'in_progress'
            ? 'border-brand bg-brand/20'
            : task.status === 'on_hold'
            ? 'border-red-500 bg-red-500/20'
            : 'border-white/30 hover:border-white/60'
        }`}
      >
        {task.status === 'done' && <span className="text-white text-[11px] leading-none">✓</span>}
        {task.status === 'in_progress' && <span className="w-2 h-2 rounded-full bg-brand" />}
        {task.status === 'on_hold' && <span className="text-red-400 text-[10px] leading-none">!</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{task.title}</p>
        {task.description && (
          <p className="italic text-white/30 text-xs mt-0.5 truncate">“{task.description}”</p>
        )}
      </div>

      <select
        value={task.assignee_id ?? ''}
        onChange={(e) => onChangeAssignee(e.target.value)}
        disabled={disabled}
        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-white/30 w-28"
      >
        <option value="" className="bg-black">미배정</option>
        {assignees.map((u) => (
          <option key={u.id} value={u.id} className="bg-black">{u.name}</option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded px-2 py-1 cursor-pointer hover:border-white/20 transition-colors">
        <Calendar size={12} className="text-white/40" />
        <span className="text-[10px] text-white/40 font-medium tracking-wider">마감</span>
        <input
          type="date"
          value={task.due_date ?? ''}
          onChange={(e) => onChangeDate(e.target.value)}
          disabled={disabled}
          className="bg-transparent text-xs text-white/80 focus:outline-none font-mono w-[88px] [color-scheme:dark]"
        />
      </label>

      <span
        className={`px-2 py-0.5 rounded text-xs font-medium w-14 text-center ${
          statusOpt?.className ?? ''
        }`}
      >
        {statusOpt?.label}
      </span>

      <button
        onClick={onDelete}
        disabled={disabled}
        className="text-white/30 hover:text-red-400 transition-colors p-1"
        title="삭제"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function CreateTaskModal({
  assignees,
  onClose,
  onSubmit,
}: {
  assignees: AssigneeOption[];
  onClose: () => void;
  onSubmit: (p: { title: string; tag: TaskCategory | ''; assignee_id: string; due_date: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<TaskCategory | ''>('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!dueDate) {
      alert('마감일을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    await onSubmit({ title: title.trim(), tag, assignee_id: assigneeId, due_date: dueDate });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">새 TO-DO</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-white/50 text-xs mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-1">카테고리</label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as TaskCategory | '')}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            >
              <option value="" className="bg-black">— 선택 안 함 —</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-black">{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-1">담당자</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            >
              <option value="" className="bg-black">미배정</option>
              {assignees.map((u) => (
                <option key={u.id} value={u.id} className="bg-black">{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-1">마감일 *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded border border-white/10 text-white/70 hover:bg-white/5 text-sm transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded bg-brand hover:bg-brand/90 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// 프로젝트 수정 모달
// =====================================================================

type EditPayload = {
  name: string;
  description: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  pm_id: string;
  partner_id: string;
  participants: ParticipantEntry[];
};

function EditProjectModal({
  project,
  assignees,
  partnerCompanies,
  partnerWorkers,
  onClose,
  onSubmit,
}: {
  project: ProjectDetail;
  assignees: AssigneeOption[];
  partnerCompanies: PartnerOption[];
  partnerWorkers: PartnerOption[];
  onClose: () => void;
  onSubmit: (p: EditPayload) => Promise<boolean>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [startDate, setStartDate] = useState((project.start_date ?? '').slice(0, 10));
  const [endDate, setEndDate] = useState((project.end_date ?? '').slice(0, 10));
  const [pmId, setPmId] = useState(project.pm_id ?? '');
  const [partnerId, setPartnerId] = useState(project.partner_id ? String(project.partner_id) : '');
  const [parts, setParts] = useState<ParticipantEntry[]>(project.participants);
  const [submitting, setSubmitting] = useState(false);

  // picker tab
  const [pickerTab, setPickerTab] = useState<'user' | 'partner_worker' | 'partner_company'>('user');
  const [pickerValue, setPickerValue] = useState('');

  function isAlreadyAdded(kind: ParticipantEntry['kind'], id: string | number) {
    return parts.some((p) => p.kind === kind && String(p.id) === String(id));
  }

  function addParticipant() {
    if (!pickerValue) return;
    if (pickerTab === 'user') {
      if (pickerValue === pmId) {
        alert('PM은 이미 참여 중입니다.');
        return;
      }
      const u = assignees.find((a) => a.id === pickerValue);
      if (!u) return;
      if (isAlreadyAdded('user', u.id)) return;
      setParts([...parts, { kind: 'user', id: u.id, name: u.name }]);
    } else if (pickerTab === 'partner_worker') {
      const w = partnerWorkers.find((a) => String(a.id) === pickerValue);
      if (!w) return;
      if (isAlreadyAdded('partner_worker', w.id)) return;
      setParts([...parts, { kind: 'partner_worker', id: w.id, name: w.name }]);
    } else {
      const c = partnerCompanies.find((a) => String(a.id) === pickerValue);
      if (!c) return;
      if (isAlreadyAdded('partner_company', c.id)) return;
      setParts([...parts, { kind: 'partner_company', id: c.id, name: c.name }]);
    }
    setPickerValue('');
  }

  function removeParticipant(idx: number) {
    setParts(parts.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('프로젝트 이름을 입력하세요.');
      return;
    }
    setSubmitting(true);
    const ok = await onSubmit({
      name: name.trim(),
      description,
      status,
      start_date: startDate,
      end_date: endDate,
      pm_id: pmId,
      partner_id: partnerId,
      participants: parts,
    });
    setSubmitting(false);
    if (!ok) return;
  }

  const KIND_LABEL: Record<ParticipantEntry['kind'], string> = {
    user: '직원',
    partner_worker: '외주',
    partner_company: '업체',
  };
  const KIND_COLOR: Record<ParticipantEntry['kind'], string> = {
    user: 'bg-brand/20 text-brand',
    partner_worker: 'bg-amber-500/20 text-amber-400',
    partner_company: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">프로젝트 수정</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-white/50 text-xs mb-1">프로젝트 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-white/50 text-xs mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 resize-y"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-white/50 text-xs mb-1">단계</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-black">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">마감일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 text-xs mb-1">PM (리드)</label>
              <select
                value={pmId}
                onChange={(e) => setPmId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              >
                <option value="" className="bg-black">미지정</option>
                {assignees.map((u) => (
                  <option key={u.id} value={u.id} className="bg-black">
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">클라이언트 (업체)</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              >
                <option value="" className="bg-black">미지정</option>
                {partnerCompanies.map((c) => (
                  <option key={c.id} value={String(c.id)} className="bg-black">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/50 text-xs mb-2">참여자</label>

            {/* 현재 참여자 chips */}
            {parts.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {parts.map((p, i) => (
                  <span
                    key={`${p.kind}-${p.id}-${i}`}
                    className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded bg-white/5 border border-white/10 text-xs text-white"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${KIND_COLOR[p.kind]}`}
                    >
                      {KIND_LABEL[p.kind]}
                    </span>
                    {p.name}
                    <button
                      onClick={() => removeParticipant(i)}
                      className="text-white/40 hover:text-red-400 p-0.5"
                      title="제거"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-xs mb-3">참여자가 없습니다.</p>
            )}

            {/* picker */}
            <div className="rounded border border-white/10 p-3 bg-white/[0.02]">
              <div className="flex gap-1 mb-2">
                {(
                  [
                    { v: 'user', label: '직원' },
                    { v: 'partner_worker', label: '외주담당자' },
                    { v: 'partner_company', label: '외주업체' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.v}
                    onClick={() => {
                      setPickerTab(t.v);
                      setPickerValue('');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      pickerTab === t.v
                        ? 'bg-white/15 text-white'
                        : 'bg-transparent text-white/40 hover:bg-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={pickerValue}
                  onChange={(e) => setPickerValue(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
                >
                  <option value="" className="bg-black">— 선택 —</option>
                  {pickerTab === 'user' &&
                    assignees
                      .filter(
                        (u) => u.id !== pmId && !parts.some((p) => p.kind === 'user' && p.id === u.id)
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id} className="bg-black">
                          {u.name}
                        </option>
                      ))}
                  {pickerTab === 'partner_worker' &&
                    partnerWorkers
                      .filter((w) => !parts.some((p) => p.kind === 'partner_worker' && p.id === w.id))
                      .map((w) => (
                        <option key={w.id} value={String(w.id)} className="bg-black">
                          {w.name}
                        </option>
                      ))}
                  {pickerTab === 'partner_company' &&
                    partnerCompanies
                      .filter(
                        (c) => !parts.some((p) => p.kind === 'partner_company' && p.id === c.id)
                      )
                      .map((c) => (
                        <option key={c.id} value={String(c.id)} className="bg-black">
                          {c.name}
                        </option>
                      ))}
                </select>
                <button
                  onClick={addParticipant}
                  disabled={!pickerValue}
                  className="px-3 rounded bg-brand text-white text-xs font-bold hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded border border-white/10 text-white/70 hover:bg-white/5 text-sm transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded bg-brand hover:bg-brand/90 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
