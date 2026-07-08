'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Send, XCircle } from 'lucide-react';
import {
  availabilityStatusLabel,
  staffAvailabilityProjectForKey,
  type StaffAvailabilityPollRow,
} from '@/lib/staff-availability';

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type PublicAvailabilityStatus = 'available' | 'unavailable';

export default function StaffAvailabilityClient({ initialPoll }: { initialPoll: StaffAvailabilityPollRow }) {
  const [poll, setPoll] = useState(initialPoll);
  const project = staffAvailabilityProjectForKey(poll.project_key);
  const [status, setStatus] = useState<PublicAvailabilityStatus>(
    initialPoll.response_status === 'unavailable' ? 'unavailable' : 'available'
  );
  const [rateNote, setRateNote] = useState(initialPoll.rate_note ?? '');
  const [equipmentNote, setEquipmentNote] = useState(initialPoll.equipment_note ?? '');
  const [message, setMessage] = useState(initialPoll.message ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(initialPoll.response_status !== 'pending');
  const [error, setError] = useState('');

  const applyHref = `/staff/apply?source=availability&availability_token=${encodeURIComponent(poll.token)}`;

  async function submit() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/availability/${encodeURIComponent(poll.token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_status: status,
          rate_note: rateNote,
          equipment_note: equipmentNote,
          message,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '저장에 실패했습니다.');
      setPoll(result.poll);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-6">
        <div className="mb-5">
          <p className="text-xs font-semibold text-brand">REACT studio</p>
          <h1 className="mt-3 break-keep text-[1.85rem] font-black leading-tight tracking-normal">
            {project.heading}
          </h1>
          <div className="mt-3 space-y-1 text-sm leading-relaxed text-white/55">
            {project.intro.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <section className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-bold tracking-[0.14em] text-white/35">{project.label}</p>
          <h2 className="mt-2 text-lg font-black">{project.title}</h2>
          <div className="mt-3 grid gap-2 text-sm leading-relaxed text-white/60">
            <p>지역: {project.location}</p>
            <p>기준: {project.schedule}</p>
            <p>내용: {project.workload}</p>
            <p>{project.flow}</p>
          </div>
        </section>

        {saved && (
          <section className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-4">
            <p className="text-sm font-bold text-emerald-100">
              현재 응답: {availabilityStatusLabel(poll.response_status)}
            </p>
            {poll.response_status === 'available' && (
              <p className="mt-1 text-sm text-emerald-100/75">{project.savedAvailableDetail}</p>
            )}
            {poll.rate_note && <p className="mt-1 text-sm text-emerald-100/75">기준 단가: {poll.rate_note}</p>}
          </section>
        )}

        <section className="mt-4 space-y-4 rounded-md border border-white/10 bg-[#080808] p-4">
          <div className="grid gap-2">
            {[
              {
                value: 'available' as const,
                label: '가능합니다',
                description: project.availableDescription,
                icon: CheckCircle2,
              },
              {
                value: 'unavailable' as const,
                label: '불가능합니다',
                description: project.unavailableDescription,
                icon: XCircle,
              },
            ].map((option) => {
              const Icon = option.icon;
              const active = status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={cls(
                    'flex items-center gap-3 rounded-md border p-3 text-left transition',
                    active ? 'border-brand bg-brand/15' : 'border-white/10 bg-white/[0.025] hover:border-white/25'
                  )}
                >
                  <Icon className={active ? 'text-brand' : 'text-white/35'} size={22} />
                  <span>
                    <span className="block text-sm font-black">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-white/45">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {project.rateLabel && (
            <Field
              label={project.rateLabel}
              value={rateNote}
              onChange={setRateNote}
              placeholder={project.ratePlaceholder ?? ''}
              rows={2}
            />
          )}
          <Field
            label={project.equipmentLabel}
            value={equipmentNote}
            onChange={setEquipmentNote}
            placeholder={project.equipmentPlaceholder}
          />
          <Field
            label="남길 말"
            value={message}
            onChange={setMessage}
            placeholder={project.messagePlaceholder}
            rows={4}
          />

          {error && <p className="rounded border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}

          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded bg-white text-sm font-black text-black transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            {busy ? '저장 중' : saved ? project.savedSubmitLabel : project.submitLabel}
          </button>
        </section>

        <section className="mt-4 rounded-md border border-white/10 p-4">
          <p className="text-sm leading-relaxed text-white/55">
            스탭풀 등록 정보는 보내주신 자료를 바탕으로 먼저 정리해두겠습니다.
            <br />
            수정할 내용이 있으면 직접 등록 양식에서 고쳐 남겨주세요.
          </p>
          <Link
            href={applyHref}
            className="mt-3 block rounded border border-white/15 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-brand hover:text-brand"
          >
            스탭풀 등록 정보 확인·수정하기
          </Link>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/35">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded border border-white/10 bg-black px-3 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-brand/70"
      />
    </label>
  );
}
