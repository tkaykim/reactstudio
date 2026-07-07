'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Send, XCircle } from 'lucide-react';
import {
  STAFF_AVAILABILITY_DAYS,
  STAFF_AVAILABILITY_PROJECT,
  availabilityDayLabel,
  availabilityStatusLabel,
  type StaffAvailabilityDay,
  type StaffAvailabilityPollRow,
  type StaffAvailabilityStatus,
} from '@/lib/staff-availability';

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const responseOptions: Array<{
  value: Exclude<StaffAvailabilityStatus, 'pending'>;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
}> = [
  {
    value: 'available',
    label: '진행 가능합니다',
    description: '정기 일정으로 검토 가능합니다.',
    icon: CheckCircle2,
  },
  {
    value: 'maybe',
    label: '조율 가능해요',
    description: '요일이나 시간 조건을 맞춰봐야 합니다.',
    icon: Clock3,
  },
  {
    value: 'unavailable',
    label: '이번 건은 어렵습니다',
    description: '스탭풀 등록은 유지할 수 있습니다.',
    icon: XCircle,
  },
];

export default function StaffAvailabilityClient({ initialPoll }: { initialPoll: StaffAvailabilityPollRow }) {
  const [poll, setPoll] = useState(initialPoll);
  const [status, setStatus] = useState<StaffAvailabilityStatus>(
    initialPoll.response_status === 'pending' ? 'available' : initialPoll.response_status
  );
  const [days, setDays] = useState<StaffAvailabilityDay[]>(initialPoll.available_days ?? []);
  const [preferredTime, setPreferredTime] = useState(initialPoll.preferred_time ?? '');
  const [rateNote, setRateNote] = useState(initialPoll.rate_note ?? '');
  const [equipmentNote, setEquipmentNote] = useState(initialPoll.equipment_note ?? '');
  const [message, setMessage] = useState(initialPoll.message ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(initialPoll.response_status !== 'pending');
  const [error, setError] = useState('');

  const applyHref = `/staff/apply?source=availability&availability_token=${encodeURIComponent(poll.token)}`;

  function toggleDay(day: StaffAvailabilityDay) {
    setDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]));
  }

  async function submit() {
    setError('');
    if ((status === 'available' || status === 'maybe') && days.length === 0) {
      setError('가능한 요일을 하나 이상 선택해 주세요.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/staff/availability/${encodeURIComponent(poll.token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_status: status,
          available_days: status === 'unavailable' ? [] : days,
          preferred_time: preferredTime,
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
          <h1 className="mt-3 text-[2rem] font-black leading-tight tracking-normal">
            고정 촬영·편집건 가능 여부를 알려주세요.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            보내주신 내용을 바탕으로 먼저 검토 중입니다.
            <br />
            이번 건이 맞지 않아도 이후 프로젝트 연락을 위해 스탭풀 등록은 이어갈 수 있습니다.
          </p>
        </div>

        <section className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">Project</p>
          <h2 className="mt-2 text-lg font-black">{STAFF_AVAILABILITY_PROJECT.title}</h2>
          <div className="mt-3 grid gap-2 text-sm leading-relaxed text-white/60">
            <p>장소: {STAFF_AVAILABILITY_PROJECT.location}</p>
            <p>소요: {STAFF_AVAILABILITY_PROJECT.workload}</p>
            <p>{STAFF_AVAILABILITY_PROJECT.flow}</p>
          </div>
        </section>

        {saved && (
          <section className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-4">
            <p className="text-sm font-bold text-emerald-100">
              현재 응답: {availabilityStatusLabel(poll.response_status)}
            </p>
            {poll.available_days.length > 0 && (
              <p className="mt-1 text-sm text-emerald-100/75">
                {poll.available_days.map(availabilityDayLabel).join(', ')}
              </p>
            )}
          </section>
        )}

        <section className="mt-4 space-y-4 rounded-md border border-white/10 bg-[#080808] p-4">
          <div className="grid gap-2">
            {responseOptions.map((option) => {
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

          {status !== 'unavailable' && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white/35">가능 요일</p>
              <div className="grid grid-cols-3 gap-2">
                {STAFF_AVAILABILITY_DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cls(
                      'h-11 rounded border text-sm font-bold transition',
                      days.includes(day.value)
                        ? 'border-brand bg-brand text-white'
                        : 'border-white/10 bg-black text-white/55 hover:border-white/25'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field
            label="가능 시간대"
            value={preferredTime}
            onChange={setPreferredTime}
            placeholder="예: 오후 2시 이후, 저녁 가능, 일정별 협의"
          />
          <Field
            label="금액 기준"
            value={rateNote}
            onChange={setRateNote}
            placeholder="예: 회차별 협의, 1회 기준 희망 금액"
          />
          <Field
            label="장비·툴 참고"
            value={equipmentNote}
            onChange={setEquipmentNote}
            placeholder="예: 개인 카메라 사용 가능, 현장 PC 편집 가능"
          />
          <Field
            label="남길 말"
            value={message}
            onChange={setMessage}
            placeholder="일정 조건이나 확인이 필요한 내용을 남겨주세요."
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
            {busy ? '저장 중' : saved ? '응답 수정하기' : '가능 여부 저장하기'}
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
