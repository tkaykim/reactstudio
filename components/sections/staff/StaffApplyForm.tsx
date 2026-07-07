'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, FileUp, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import {
  STAFF_APPLICANT_TYPES,
  STAFF_CAPABILITY_OPTIONS,
  STAFF_EQUIPMENT_SUGGESTIONS,
  STAFF_EXPERIENCE_LEVELS,
  STAFF_PROFICIENCY_OPTIONS,
  STAFF_RATE_UNITS,
  STAFF_SKILL_GROUPS,
  STAFF_TOOL_SUGGESTIONS,
  normalizeUrlList,
  splitLines,
  type StaffApplicantType,
  type StaffCapability,
  type StaffExperienceLevel,
  type StaffProficiency,
  type StaffRateUnit,
  type StaffSkillGroup,
} from '@/lib/staff-pool';

type CapabilityDetail = {
  proficiency: StaffProficiency;
  role_detail: string;
  portfolio_urls: string;
  tools: string;
  equipment: string;
  notes: string;
};

type SkillDraft = {
  id: string;
  group: StaffSkillGroup;
  skill_name: string;
  experience_level: StaffExperienceLevel;
  years_experience: string;
  role_detail: string;
  representative_work_url: string;
  tools: string;
  equipment: string;
  notes: string;
};

type RateDraft = {
  id: string;
  skill_group: StaffSkillGroup;
  skill_name: string;
  rate_unit: StaffRateUnit;
  min_amount: string;
  max_amount: string;
  is_negotiable: boolean;
  includes_equipment: boolean;
  notes: string;
};

type FormState = {
  applicant_type: StaffApplicantType;
  display_name: string;
  legal_name: string;
  company_name: string;
  representative_name: string;
  contact_name: string;
  phone: string;
  email: string;
  birth_date: string;
  business_registration_number: string;
  opened_on: string;
  region: string;
  website_url: string;
  social_links: string;
  portfolio_urls: string;
  summary: string;
  availability: string;
  preferred_project_types: string;
  equipment_detail: string;
  tools: string;
  ai_tools: string;
};

type StaffApplyPrefill = {
  already_registered?: boolean;
  source_subject?: string;
  application?: Partial<FormState>;
  capabilities?: StaffCapability[];
};

const initialForm: FormState = {
  applicant_type: 'company',
  display_name: '',
  legal_name: '',
  company_name: '',
  representative_name: '',
  contact_name: '',
  phone: '',
  email: '',
  birth_date: '',
  business_registration_number: '',
  opened_on: '',
  region: '',
  website_url: '',
  social_links: '',
  portfolio_urls: '',
  summary: '',
  availability: '',
  preferred_project_types: '',
  equipment_detail: '',
  tools: '',
  ai_tools: '',
};

const initialCapabilityDetails = STAFF_CAPABILITY_OPTIONS.reduce(
  (acc, item) => ({
    ...acc,
    [item.value]: {
      proficiency: 'working',
      role_detail: '',
      portfolio_urls: '',
      tools: '',
      equipment: '',
      notes: '',
    },
  }),
  {} as Record<StaffCapability, CapabilityDetail>
);

const STAFF_FORM_STEPS = [
  { label: '기본 정보', helper: '유형과 연락처' },
  { label: '가능한 업무', helper: '할 수 있는 일' },
  { label: '세부 경력', helper: '경력과 대표작' },
  { label: '금액 기준', helper: '대략적인 범위' },
  { label: '포트폴리오', helper: '링크와 장비' },
  { label: '첨부파일', helper: '선택 제출' },
] as const;

function makeSkillDraft(group: StaffSkillGroup = 'shooting'): SkillDraft {
  return {
    id: crypto.randomUUID(),
    group,
    skill_name: '',
    experience_level: 'mid',
    years_experience: '',
    role_detail: '',
    representative_work_url: '',
    tools: '',
    equipment: '',
    notes: '',
  };
}

function makeRateDraft(group: StaffSkillGroup = 'shooting'): RateDraft {
  return {
    id: crypto.randomUUID(),
    skill_group: group,
    skill_name: '',
    rate_unit: 'per_day',
    min_amount: '',
    max_amount: '',
    is_negotiable: true,
    includes_equipment: false,
    notes: '',
  };
}

function moneyToNumber(value: string) {
  const cleaned = value.replace(/[^\d]/g, '');
  return cleaned ? Number(cleaned) : null;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
      {children}
      {required && <span className="ml-1 text-brand">*</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-brand/70 focus:bg-white/[0.07] ${props.className ?? ''}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-brand/70 focus:bg-white/[0.07] ${props.className ?? ''}`}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-md border border-white/10 bg-[#111] px-3 text-sm text-white outline-none transition focus:border-brand/70 ${props.className ?? ''}`}
    />
  );
}

export default function StaffApplyForm({ availabilityToken = '' }: { availabilityToken?: string }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCapabilities, setSelectedCapabilities] = useState<StaffCapability[]>([]);
  const [capabilityDetails, setCapabilityDetails] = useState(initialCapabilityDetails);
  const [skillDrafts, setSkillDrafts] = useState<SkillDraft[]>([makeSkillDraft('shooting')]);
  const [rateDrafts, setRateDrafts] = useState<RateDraft[]>([makeRateDraft('shooting')]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);
  const businessLicenseRef = useRef<HTMLInputElement>(null);
  const portfolioFilesRef = useRef<HTMLInputElement>(null);
  const lastStepIndex = STAFF_FORM_STEPS.length - 1;
  const currentStepInfo = STAFF_FORM_STEPS[currentStep];

  useEffect(() => {
    if (!availabilityToken) return;
    let alive = true;
    setPrefillLoading(true);
    fetch(`/api/staff/apply/prefill?token=${encodeURIComponent(availabilityToken)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result: { prefill?: StaffApplyPrefill } | null) => {
        if (!alive || !result?.prefill) return;
        const prefill = result.prefill;
        if (prefill.application) {
          setForm((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(prefill.application ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
            ),
          }));
        }
        if (prefill.capabilities?.length) {
          setSelectedCapabilities((prev) => Array.from(new Set([...prev, ...prefill.capabilities!])));
        }
        setPrefillLoaded(true);
      })
      .catch(() => {
        if (alive) setPrefillLoaded(false);
      })
      .finally(() => {
        if (alive) setPrefillLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [availabilityToken]);

  const skillNames = useMemo(
    () => Array.from(new Set(STAFF_SKILL_GROUPS.flatMap((group) => group.skills))).sort(),
    []
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCapability(category: StaffCapability) {
    setSelectedCapabilities((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  }

  function updateCapability(category: StaffCapability, patch: Partial<CapabilityDetail>) {
    setCapabilityDetails((prev) => ({
      ...prev,
      [category]: { ...prev[category], ...patch },
    }));
  }

  function moveToStep(step: number) {
    const nextStep = Math.max(0, Math.min(step, lastStepIndex));
    setCurrentStep(nextStep);
    setError('');
    window.setTimeout(() => {
      formTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 0);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    const payload = {
      applicant_type: form.applicant_type,
      display_name: form.display_name.trim(),
      legal_name: form.legal_name.trim(),
      company_name: form.company_name.trim(),
      representative_name: form.representative_name.trim(),
      contact_name: form.contact_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      birth_date: form.birth_date,
      business_registration_number: form.business_registration_number.trim(),
      opened_on: form.opened_on,
      region: form.region.trim(),
      website_url: form.website_url.trim(),
      social_links: normalizeUrlList(form.social_links),
      portfolio_urls: normalizeUrlList(form.portfolio_urls),
      summary: form.summary.trim(),
      availability: form.availability.trim(),
      preferred_project_types: splitLines(form.preferred_project_types),
      equipment: splitLines(form.equipment_detail),
      equipment_detail: form.equipment_detail.trim(),
      tools: splitLines(form.tools),
      ai_tools: splitLines(form.ai_tools),
    };

    if (!payload.display_name || !payload.email || !payload.phone) {
      setError('이름 또는 회사명, 이메일, 연락처를 입력해 주세요.');
      setSubmitting(false);
      return;
    }

    const capabilities = selectedCapabilities.map((category) => {
      const detail = capabilityDetails[category];
      return {
        category,
        proficiency: detail.proficiency,
        role_detail: detail.role_detail.trim(),
        portfolio_urls: normalizeUrlList(detail.portfolio_urls),
        tools: splitLines(detail.tools),
        equipment: splitLines(detail.equipment),
        notes: detail.notes.trim(),
      };
    });

    const skill_entries = skillDrafts
      .filter((item) => item.skill_name.trim())
      .map((item) => ({
        group: item.group,
        skill_name: item.skill_name.trim(),
        experience_level: item.experience_level,
        years_experience: item.years_experience ? Number(item.years_experience) : null,
        role_detail: item.role_detail.trim(),
        representative_work_url: item.representative_work_url.trim(),
        tools: splitLines(item.tools),
        equipment: splitLines(item.equipment),
        notes: item.notes.trim(),
      }));

    const rate_cards = rateDrafts
      .filter((item) => item.skill_group)
      .map((item) => ({
        skill_group: item.skill_group,
        skill_name: item.skill_name.trim(),
        rate_unit: item.rate_unit,
        currency: 'KRW',
        min_amount: moneyToNumber(item.min_amount),
        max_amount: moneyToNumber(item.max_amount),
        is_negotiable: item.is_negotiable,
        includes_equipment: item.includes_equipment,
        notes: item.notes.trim(),
      }));

    const body = new FormData();
    body.set('application', JSON.stringify(payload));
    body.set('capabilities', JSON.stringify(capabilities));
    body.set('skill_entries', JSON.stringify(skill_entries));
    body.set('rate_cards', JSON.stringify(rate_cards));
    if (availabilityToken) body.set('availability_token', availabilityToken);

    Array.from(businessLicenseRef.current?.files ?? []).forEach((file) => {
      body.append('business_license', file);
    });
    Array.from(portfolioFilesRef.current?.files ?? []).forEach((file) => {
      body.append('portfolio_files', file);
    });

    try {
      const res = await fetch('/api/staff/apply', {
        method: 'POST',
        body,
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '지원서 제출에 실패했습니다.');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '지원서 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10">
          <Check className="text-emerald-200" size={38} />
        </div>
        <p className="mb-3 text-sm font-semibold text-brand">접수 완료</p>
        <h2 className="text-3xl font-black text-white">지원서가 접수됐습니다.</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          보내주신 업무 범위, 경력, 금액 기준을 검토한 뒤 프로젝트 조건이 맞을 때 연락드리겠습니다.
        </p>
      </div>
    );
  }

  return (
    <div ref={formTopRef} className="space-y-6">
      {(prefillLoading || prefillLoaded) && (
        <div className="rounded-md border border-brand/20 bg-brand/10 p-3 text-sm leading-relaxed text-white/70">
          {prefillLoading
            ? '보내주신 메일 내용을 불러오는 중입니다.'
            : '보내주신 메일 내용을 바탕으로 일부 항목을 먼저 채웠습니다. 필요한 부분만 확인하거나 수정해 주세요.'}
        </div>
      )}

      <div className="rounded-md border border-white/10 bg-white/[0.025] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-brand">{currentStep + 1}단계</p>
            <p className="mt-1 text-lg font-black text-white">{currentStepInfo.label}</p>
          </div>
          <p className="shrink-0 text-xs font-bold text-white/40">
            {currentStep + 1} / {STAFF_FORM_STEPS.length}
          </p>
        </div>
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STAFF_FORM_STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 xl:grid-cols-6">
          {STAFF_FORM_STEPS.map((step, index) => {
            const active = index === currentStep;
            const done = index < currentStep;
            return (
              <button
                key={step.label}
                type="button"
                onClick={() => moveToStep(index)}
                className={`min-w-24 shrink-0 rounded border px-3 py-2 text-left transition sm:min-w-0 ${
                  active
                    ? 'border-brand bg-brand/10 text-white'
                    : done
                      ? 'border-white/15 bg-white/[0.04] text-white/65'
                      : 'border-white/10 bg-black/20 text-white/35 hover:border-white/20 hover:text-white/55'
                }`}
              >
                <span className="block text-xs font-bold">{step.label}</span>
                <span className="mt-0.5 hidden text-[11px] sm:block">{step.helper}</span>
              </button>
            );
          })}
        </div>
      </div>

      {currentStep === 0 && (
      <section className="border-y border-white/10 py-6 sm:py-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-brand">1단계</p>
            <h2 className="mt-2 text-2xl font-black text-white">지원자 정보</h2>
          </div>
          <p className="hidden max-w-xs text-right text-xs leading-relaxed text-white/40 sm:block">
            지원 유형에 따라 필요한 정보만 작성해 주세요.
          </p>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {STAFF_APPLICANT_TYPES.map((type) => {
            const selected = form.applicant_type === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => update('applicant_type', type.value)}
                className={`rounded-md border p-4 text-left transition ${
                  selected
                    ? 'border-brand bg-brand/10 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25 hover:bg-white/[0.05]'
                }`}
              >
                <span className="flex items-center justify-between text-sm font-bold">
                  {type.label}
                  {selected && <Check size={16} className="text-brand" />}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-white/45">{type.description}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel required>
              {form.applicant_type === 'company' ? '회사명' : '이름 또는 팀명'}
            </FieldLabel>
            <TextInput
              value={form.display_name}
              onChange={(e) => update('display_name', e.target.value)}
              placeholder={form.applicant_type === 'company' ? '회사명' : '이름 또는 팀명'}
            />
          </div>
          <div>
            <FieldLabel>법적 명칭 또는 본명</FieldLabel>
            <TextInput
              value={form.legal_name}
              onChange={(e) => update('legal_name', e.target.value)}
              placeholder="계약서에 들어갈 이름"
            />
          </div>
          {form.applicant_type !== 'individual' && (
            <>
              <div>
                <FieldLabel>대표자명</FieldLabel>
                <TextInput
                  value={form.representative_name}
                  onChange={(e) => update('representative_name', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>담당자명</FieldLabel>
                <TextInput
                  value={form.contact_name}
                  onChange={(e) => update('contact_name', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>사업자등록번호</FieldLabel>
                <TextInput
                  value={form.business_registration_number}
                  onChange={(e) => update('business_registration_number', e.target.value)}
                  placeholder="000-00-00000"
                />
              </div>
              <div>
                <FieldLabel>개업연월</FieldLabel>
                <TextInput
                  type="date"
                  value={form.opened_on}
                  onChange={(e) => update('opened_on', e.target.value)}
                />
              </div>
            </>
          )}
          {form.applicant_type === 'individual' && (
            <div>
              <FieldLabel>생년월일</FieldLabel>
              <TextInput
                type="date"
                value={form.birth_date}
                onChange={(e) => update('birth_date', e.target.value)}
              />
            </div>
          )}
          <div>
            <FieldLabel required>연락처</FieldLabel>
            <TextInput
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>
          <div>
            <FieldLabel required>이메일</FieldLabel>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="hello@example.com"
            />
          </div>
          <div>
            <FieldLabel>활동 지역</FieldLabel>
            <TextInput
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
              placeholder="서울, 수도권, 전국 출장 가능 등"
            />
          </div>
          <div>
            <FieldLabel>웹사이트</FieldLabel>
            <TextInput
              value={form.website_url}
              onChange={(e) => update('website_url', e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>
      </section>
      )}

      {currentStep === 1 && (
      <section className="border-b border-white/10 pb-8">
        <div className="mb-5">
          <p className="text-xs font-semibold text-brand">2단계</p>
          <h2 className="mt-2 text-2xl font-black text-white">가능한 업무</h2>
          <p className="mt-2 text-sm text-white/45">
            해당하는 업무를 모두 선택해 주세요.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {STAFF_CAPABILITY_OPTIONS.map((capability) => {
            const selected = selectedCapabilities.includes(capability.value);
            return (
              <button
                key={capability.value}
                type="button"
                onClick={() => toggleCapability(capability.value)}
                className={`rounded-md border p-4 text-left transition ${selected ? capability.className : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25'}`}
              >
                <span className="flex items-center justify-between text-sm font-bold">
                  {capability.label}
                  {selected && <Check size={16} />}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-white/45">{capability.description}</span>
              </button>
            );
          })}
        </div>

        {selectedCapabilities.length > 0 && (
          <div className="mt-6 space-y-4">
            {selectedCapabilities.map((category) => {
              const label = STAFF_CAPABILITY_OPTIONS.find((item) => item.value === category)?.label ?? category;
              const detail = capabilityDetails[category];
              return (
                <div key={category} className="rounded-md border border-white/10 bg-white/[0.025] p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="font-bold text-white">{label}</h3>
                    <ChevronDown size={16} className="text-white/30" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel>수준</FieldLabel>
                      <SelectInput
                        value={detail.proficiency}
                        onChange={(e) =>
                          updateCapability(category, { proficiency: e.target.value as StaffProficiency })
                        }
                      >
                        {STAFF_PROFICIENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                    <div>
                      <FieldLabel>대표 작업 링크</FieldLabel>
                      <TextInput
                        value={detail.portfolio_urls}
                        onChange={(e) => updateCapability(category, { portfolio_urls: e.target.value })}
                        placeholder="여러 개면 줄바꿈 또는 쉼표"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>수행 가능한 역할</FieldLabel>
                      <TextArea
                        rows={2}
                        value={detail.role_detail}
                        onChange={(e) => updateCapability(category, { role_detail: e.target.value })}
                        placeholder="예: 공연 멀티캠 촬영 리드, 댄스 영상 컷편집, AI 소스 제작"
                      />
                    </div>
                    <div>
                      <FieldLabel>주 사용 툴</FieldLabel>
                      <TextInput
                        value={detail.tools}
                        onChange={(e) => updateCapability(category, { tools: e.target.value })}
                        placeholder="Premiere, After Effects 등"
                      />
                    </div>
                    <div>
                      <FieldLabel>관련 장비</FieldLabel>
                      <TextInput
                        value={detail.equipment}
                        onChange={(e) => updateCapability(category, { equipment: e.target.value })}
                        placeholder="카메라, 조명, 짐벌 등"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>비고</FieldLabel>
                      <TextArea
                        rows={2}
                        value={detail.notes}
                        onChange={(e) => updateCapability(category, { notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {currentStep === 2 && (
      <section className="border-b border-white/10 pb-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-brand">3단계</p>
            <h2 className="mt-2 text-2xl font-black text-white">세부 스킬과 경력</h2>
            <p className="mt-2 text-sm text-white/45">
              촬영, 편집, OAP, 송출처럼 실제로 맡을 수 있는 작업을 자세히 적어주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSkillDrafts((prev) => [...prev, makeSkillDraft('shooting')])}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-white/70 transition hover:border-brand/50 hover:text-white"
          >
            <Plus size={14} /> 스킬 추가
          </button>
        </div>

        <datalist id="react-staff-skill-list">
          {skillNames.map((skill) => (
            <option key={skill} value={skill} />
          ))}
        </datalist>
        <datalist id="react-staff-tool-list">
          {STAFF_TOOL_SUGGESTIONS.map((tool) => (
            <option key={tool} value={tool} />
          ))}
        </datalist>
        <datalist id="react-staff-equipment-list">
          {STAFF_EQUIPMENT_SUGGESTIONS.map((equipment) => (
            <option key={equipment} value={equipment} />
          ))}
        </datalist>

        <div className="space-y-4">
          {skillDrafts.map((draft, index) => (
            <div key={draft.id} className="rounded-md border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-white">세부 스킬 {index + 1}</span>
                {skillDrafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSkillDrafts((prev) => prev.filter((item) => item.id !== draft.id))}
                    className="rounded p-1.5 text-white/35 transition hover:bg-red-400/10 hover:text-red-200"
                    aria-label="스킬 삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>업무 구분</FieldLabel>
                  <SelectInput
                    value={draft.group}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, group: e.target.value as StaffSkillGroup } : item
                        )
                      )
                    }
                  >
                    {STAFF_SKILL_GROUPS.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel required>세부 스킬명</FieldLabel>
                  <TextInput
                    list="react-staff-skill-list"
                    value={draft.skill_name}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, skill_name: e.target.value } : item
                        )
                      )
                    }
                    placeholder="예: 짐벌 촬영, OAP, 디자인 자막"
                  />
                </div>
                <div>
                  <FieldLabel>경력 수준</FieldLabel>
                  <SelectInput
                    value={draft.experience_level}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id
                            ? { ...item, experience_level: e.target.value as StaffExperienceLevel }
                            : item
                        )
                      )
                    }
                  >
                    {STAFF_EXPERIENCE_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>경력년수</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    step="0.5"
                    value={draft.years_experience}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, years_experience: e.target.value } : item
                        )
                      )
                    }
                    placeholder="예: 3"
                  />
                </div>
                <div>
                  <FieldLabel>대표작 URL</FieldLabel>
                  <TextInput
                    value={draft.representative_work_url}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id
                            ? { ...item, representative_work_url: e.target.value }
                            : item
                        )
                      )
                    }
                    placeholder="https://"
                  />
                </div>
                <div>
                  <FieldLabel>툴</FieldLabel>
                  <TextInput
                    list="react-staff-tool-list"
                    value={draft.tools}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) => (item.id === draft.id ? { ...item, tools: e.target.value } : item))
                      )
                    }
                    placeholder="여러 개면 쉼표"
                  />
                </div>
                <div>
                  <FieldLabel>장비</FieldLabel>
                  <TextInput
                    list="react-staff-equipment-list"
                    value={draft.equipment}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, equipment: e.target.value } : item
                        )
                      )
                    }
                    placeholder="여러 개면 쉼표"
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>맡았던 역할</FieldLabel>
                  <TextArea
                    rows={2}
                    value={draft.role_detail}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, role_detail: e.target.value } : item
                        )
                      )
                    }
                    placeholder="이 스킬에서 실제로 맡았던 역할을 적어주세요."
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>추가 메모</FieldLabel>
                  <TextArea
                    rows={2}
                    value={draft.notes}
                    onChange={(e) =>
                      setSkillDrafts((prev) =>
                        prev.map((item) => (item.id === draft.id ? { ...item, notes: e.target.value } : item))
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {currentStep === 3 && (
      <section className="border-b border-white/10 pb-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-brand">4단계</p>
            <h2 className="mt-2 text-2xl font-black text-white">금액 기준</h2>
            <p className="mt-2 text-sm text-white/45">
              정확한 견적이 아니어도 괜찮습니다. 평소 기준으로 편하게 적어주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRateDrafts((prev) => [...prev, makeRateDraft('shooting')])}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-white/70 transition hover:border-brand/50 hover:text-white"
          >
            <Plus size={14} /> 금액 기준 추가
          </button>
        </div>

        <div className="space-y-4">
          {rateDrafts.map((draft, index) => (
            <div key={draft.id} className="rounded-md border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-white">금액 기준 {index + 1}</span>
                {rateDrafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRateDrafts((prev) => prev.filter((item) => item.id !== draft.id))}
                    className="rounded p-1.5 text-white/35 transition hover:bg-red-400/10 hover:text-red-200"
                    aria-label="금액 기준 삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <FieldLabel>업무 구분</FieldLabel>
                  <SelectInput
                    value={draft.skill_group}
                    onChange={(e) =>
                      setRateDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id
                            ? { ...item, skill_group: e.target.value as StaffSkillGroup }
                            : item
                        )
                      )
                    }
                  >
                    {STAFF_SKILL_GROUPS.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>세부 스킬</FieldLabel>
                  <TextInput
                    list="react-staff-skill-list"
                    value={draft.skill_name}
                    onChange={(e) =>
                      setRateDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, skill_name: e.target.value } : item
                        )
                      )
                    }
                    placeholder="예: 짐벌 촬영"
                  />
                </div>
                <div>
                  <FieldLabel>단위</FieldLabel>
                  <SelectInput
                    value={draft.rate_unit}
                    onChange={(e) =>
                      setRateDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, rate_unit: e.target.value as StaffRateUnit } : item
                        )
                      )
                    }
                  >
                    {STAFF_RATE_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>장비 포함</FieldLabel>
                  <button
                    type="button"
                    onClick={() =>
                      setRateDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id
                            ? { ...item, includes_equipment: !item.includes_equipment }
                            : item
                        )
                      )
                    }
                    className={`h-11 w-full rounded-md border px-3 text-sm font-bold transition ${
                      draft.includes_equipment
                        ? 'border-lime-300/30 bg-lime-300/10 text-lime-100'
                        : 'border-white/10 bg-white/[0.04] text-white/45'
                    }`}
                  >
                    {draft.includes_equipment ? '포함' : '별도'}
                  </button>
                </div>
                <div>
                  <FieldLabel>최소 금액</FieldLabel>
                  <TextInput
                    inputMode="numeric"
                    value={draft.min_amount}
                    onChange={(e) =>
                      setRateDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, min_amount: e.target.value } : item
                        )
                      )
                    }
                    placeholder="예: 500000"
                  />
                </div>
                <div>
                  <FieldLabel>최대 금액</FieldLabel>
                  <TextInput
                    inputMode="numeric"
                    value={draft.max_amount}
                    onChange={(e) =>
                      setRateDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, max_amount: e.target.value } : item
                        )
                      )
                    }
                    placeholder="예: 1000000"
                  />
                </div>
                <div>
                  <FieldLabel>협의 가능</FieldLabel>
                  <button
                    type="button"
                    onClick={() =>
                      setRateDrafts((prev) =>
                        prev.map((item) =>
                          item.id === draft.id ? { ...item, is_negotiable: !item.is_negotiable } : item
                        )
                      )
                    }
                    className={`h-11 w-full rounded-md border px-3 text-sm font-bold transition ${
                      draft.is_negotiable
                        ? 'border-brand/40 bg-brand/10 text-white'
                        : 'border-white/10 bg-white/[0.04] text-white/45'
                    }`}
                  >
                    {draft.is_negotiable ? '가능' : '고정'}
                  </button>
                </div>
                <div className="md:col-span-4">
                  <FieldLabel>금액 관련 조건</FieldLabel>
                  <TextArea
                    rows={2}
                    value={draft.notes}
                    onChange={(e) =>
                      setRateDrafts((prev) =>
                        prev.map((item) => (item.id === draft.id ? { ...item, notes: e.target.value } : item))
                      )
                    }
                    placeholder="예: 장비/교통/조명 별도, 야간 촬영 추가비 등"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {currentStep === 4 && (
      <section className="border-b border-white/10 pb-8">
        <div className="mb-5">
          <p className="text-xs font-semibold text-brand">5단계</p>
          <h2 className="mt-2 text-2xl font-black text-white">포트폴리오와 장비</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>포트폴리오 URL</FieldLabel>
            <TextArea
              rows={4}
              value={form.portfolio_urls}
              onChange={(e) => update('portfolio_urls', e.target.value)}
              placeholder="웹사이트, 유튜브, 비메오, 인스타그램 링크"
            />
          </div>
          <div>
            <FieldLabel>SNS/연락 채널 URL</FieldLabel>
            <TextArea
              rows={4}
              value={form.social_links}
              onChange={(e) => update('social_links', e.target.value)}
              placeholder="인스타그램, 홈페이지, 노션, 링크트리 등"
            />
          </div>
          <div>
            <FieldLabel>보유 장비 현황</FieldLabel>
            <TextArea
              rows={5}
              value={form.equipment_detail}
              onChange={(e) => update('equipment_detail', e.target.value)}
              placeholder="보유 중인 카메라, 렌즈, 조명, 짐벌, 드론, 오디오 장비와 수량, 모델명, 대여 가능 여부를 자유롭게 적어주세요."
            />
          </div>
          <div>
            <FieldLabel>주 사용 툴</FieldLabel>
            <TextArea
              rows={4}
              value={form.tools}
              onChange={(e) => update('tools', e.target.value)}
              placeholder="Premiere, After Effects, DaVinci, Blender 등"
            />
          </div>
          <div>
            <FieldLabel>AI 툴</FieldLabel>
            <TextArea
              rows={3}
              value={form.ai_tools}
              onChange={(e) => update('ai_tools', e.target.value)}
              placeholder="Runway, Kling, Higgsfield, ComfyUI 등"
            />
          </div>
          <div>
            <FieldLabel>선호 프로젝트</FieldLabel>
            <TextArea
              rows={3}
              value={form.preferred_project_types}
              onChange={(e) => update('preferred_project_types', e.target.value)}
              placeholder="공연 영상, 예능, 댄스 필름, 브랜드 콘텐츠 등"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>소개와 협업 가능 범위</FieldLabel>
            <TextArea
              rows={5}
              value={form.summary}
              onChange={(e) => update('summary', e.target.value)}
              placeholder="강점, 가능한 규모, 팀 구성, 협업 방식, 최근 작업 성향을 적어주세요."
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>가능 일정과 조건</FieldLabel>
            <TextArea
              rows={3}
              value={form.availability}
              onChange={(e) => update('availability', e.target.value)}
              placeholder="예: 평일 촬영 가능, 주말 협의, 지방 출장 가능, 월 2회 이상 가능 등"
            />
          </div>
        </div>
      </section>
      )}

      {currentStep === 5 && (
      <section className="pb-4">
        <div className="mb-5">
          <p className="text-xs font-semibold text-brand">6단계</p>
          <h2 className="mt-2 text-2xl font-black text-white">첨부파일</h2>
          <p className="mt-2 text-sm text-white/45">
            첨부한 파일은 외부에 공개되지 않습니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-white/15 bg-white/[0.03] p-5 text-center transition hover:border-brand/50 hover:bg-white/[0.05]">
            <FileUp className="mb-3 text-white/35" size={24} />
            <span className="text-sm font-bold text-white">사업자등록증</span>
            <span className="mt-1 text-xs text-white/40">PDF, JPG, PNG, DOCX / 10MB 이하</span>
            <input ref={businessLicenseRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
          </label>
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-white/15 bg-white/[0.03] p-5 text-center transition hover:border-brand/50 hover:bg-white/[0.05]">
            <FileUp className="mb-3 text-white/35" size={24} />
            <span className="text-sm font-bold text-white">포트폴리오 파일</span>
            <span className="mt-1 text-xs text-white/40">회사소개서, 작업 샘플, 장비 리스트</span>
            <input ref={portfolioFilesRef} type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
          </label>
        </div>

      </section>
      )}

      {error && (
        <div className="rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={() => moveToStep(currentStep - 1)}
          disabled={currentStep === 0 || submitting}
          className="inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-md border border-white/10 px-4 text-sm font-bold text-white/55 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ArrowLeft size={16} />
          이전
        </button>

        {currentStep < lastStepIndex ? (
          <button
            type="button"
            onClick={() => moveToStep(currentStep + 1)}
            className="inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-black transition hover:bg-brand hover:text-white"
          >
            다음
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-black text-white transition hover:bg-[#ff6a2b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> 제출 중
              </>
            ) : (
              <>
                지원서 제출 <Send size={17} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
