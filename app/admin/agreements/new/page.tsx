'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Save, Loader2, Send, Plus, Trash2 } from 'lucide-react';
import type { Inquiry, PenaltyRate } from '@/types';

const DEFAULT_PENALTIES: PenaltyRate[] = [
  { label: '계약 체결 후 ~ 촬영 7일 전', rate: 30 },
  { label: '촬영 예정일 기준 7일 이내', rate: 50 },
  { label: '촬영 완료 이후', rate: 100 },
];

const inputClass =
  'w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand placeholder:text-white/20';

export default function NewAgreementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const inquiryId = searchParams.get('inquiry_id');

  const [title, setTitle] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientRepresentative, setClientRepresentative] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [deliverables, setDeliverables] = useState('편집이 완료된 최종 마스터 파일 1종');
  const [shootingDate, setShootingDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [vatType, setVatType] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [depositRate, setDepositRate] = useState(20);
  const [depositCondition, setDepositCondition] = useState('계약 체결 후 7일 이내 지급');
  const [balanceCondition, setBalanceCondition] = useState('릴리즈 예정일로부터 30일 이내 지급');
  const [freeRevisionCount, setFreeRevisionCount] = useState(2);
  const [penaltyRates, setPenaltyRates] = useState<PenaltyRate[]>(DEFAULT_PENALTIES);
  const [contractDate, setContractDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [agreementStatus, setAgreementStatus] = useState('draft');
  const [message, setMessage] = useState('');

  const balanceRate = 100 - depositRate;
  const depositAmount = Math.round(totalAmount * (depositRate / 100));
  const balanceAmount = totalAmount - depositAmount;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (editId) {
      supabase
        .from('agreements')
        .select('*')
        .eq('id', editId)
        .single()
        .then(({ data }) => {
          if (data) {
            setTitle(data.title);
            setClientCompany(data.client_company || '');
            setClientAddress(data.client_address || '');
            setClientRepresentative(data.client_representative || '');
            setClientEmail(data.client_email || '');
            setClientPhone(data.client_phone || '');
            setTaskDescription(data.task_description || '');
            setDeliverables(data.deliverables || '편집이 완료된 최종 마스터 파일 1종');
            setShootingDate(data.shooting_date || '');
            setDeliveryDate(data.delivery_date || '');
            setReleaseDate(data.release_date || '');
            setTotalAmount(Number(data.total_amount) || 0);
            setVatType(data.vat_type || 'exclusive');
            setDepositRate(data.deposit_rate || 20);
            setDepositCondition(data.deposit_condition || '계약 체결 후 7일 이내 지급');
            setBalanceCondition(data.balance_condition || '릴리즈 예정일로부터 30일 이내 지급');
            setFreeRevisionCount(data.free_revision_count ?? 2);
            setPenaltyRates(data.penalty_rates?.length ? data.penalty_rates : DEFAULT_PENALTIES);
            setContractDate(data.contract_date || '');
            setAgreementStatus(data.status || 'draft');
          }
        });
      return;
    }

    if (inquiryId) {
      supabase
        .from('inquiries')
        .select('*')
        .eq('id', inquiryId)
        .single()
        .then(({ data }) => {
          if (data) {
            const inq = data as Inquiry;
            setClientCompany(inq.company || '');
            setClientEmail(inq.email || '');
            setClientPhone(inq.phone || '');
            setTitle(`${inq.company || inq.name} - ${inq.services?.[0] || '영상 제작'}`);
            setTaskDescription(inq.project_title || '');
          }
        });
    }
  }, [editId, inquiryId]);

  async function saveAgreement(): Promise<number | null> {
    if (!title || !clientCompany) {
      setMessage('계약명과 발주자 회사명은 필수입니다.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      const body = {
        ...(editId ? { id: Number(editId) } : {}),
        title,
        client_company: clientCompany,
        client_address: clientAddress || null,
        client_representative: clientRepresentative || null,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        task_description: taskDescription || null,
        deliverables,
        shooting_date: shootingDate || null,
        delivery_date: deliveryDate || null,
        release_date: releaseDate || null,
        total_amount: totalAmount,
        vat_type: vatType,
        deposit_rate: depositRate,
        deposit_amount: depositAmount,
        balance_rate: balanceRate,
        balance_amount: balanceAmount,
        deposit_condition: depositCondition,
        balance_condition: balanceCondition,
        free_revision_count: freeRevisionCount,
        penalty_rates: penaltyRates,
        contract_date: contractDate || null,
        inquiry_id: inquiryId ? Number(inquiryId) : null,
      };

      const res = await fetch('/api/agreement', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.agreement) {
        setMessage('저장되었습니다.');
        if (!editId) {
          router.push(`/admin/agreements/new?edit=${data.agreement.id}`);
        }
        return data.agreement.id;
      } else {
        setMessage('저장 실패: ' + data.error);
        return null;
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendAgreement() {
    let id = editId ? Number(editId) : null;
    if (!id) {
      id = await saveAgreement();
      if (!id) return;
    } else {
      await saveAgreement();
    }
    setSending(true);
    setMessage('');
    try {
      const res = await fetch('/api/agreement/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setAgreementStatus('sent');
        setMessage('계약서가 고객 이메일로 발송되었습니다.');
      } else {
        setMessage('발송 실패: ' + data.error);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black text-white mb-6">
        {editId ? '계약서 수정' : '새 계약서 작성'}
      </h1>

      {/* 발주자 정보 */}
      <h2 className="text-white font-bold mb-3">발주자 정보</h2>
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">회사명 *</label>
            <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">대표이사</label>
            <input value={clientRepresentative} onChange={(e) => setClientRepresentative(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">주소</label>
          <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">이메일</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">전화번호</label>
            <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* 프로젝트 정보 */}
      <h2 className="text-white font-bold mb-3">프로젝트 정보</h2>
      <div className="space-y-4 mb-8">
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">계약명 *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: OOO 뮤직비디오 제작" className={inputClass} />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">과업 내용</label>
          <input value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="예: OOO 플래시몹 콘텐츠" className={inputClass} />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">최종 결과물</label>
          <input value={deliverables} onChange={(e) => setDeliverables(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* 일정 */}
      <h2 className="text-white font-bold mb-3">제작 일정</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">촬영 예정일</label>
          <input type="date" value={shootingDate} onChange={(e) => setShootingDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">납품 예정일</label>
          <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">릴리즈 예정일</label>
          <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* 금액 */}
      <h2 className="text-white font-bold mb-3">계약 금액</h2>
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">총 계약 금액</label>
            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} step={100000} className={inputClass} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">VAT</label>
            <select value={vatType} onChange={(e) => setVatType(e.target.value as 'exclusive' | 'inclusive')} className={inputClass}>
              <option value="exclusive" className="bg-neutral-900 text-white">별도</option>
              <option value="inclusive" className="bg-neutral-900 text-white">포함</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-white/40">선금</span>
              <div className="flex items-center gap-2">
                <input type="number" value={depositRate} onChange={(e) => setDepositRate(Number(e.target.value))} className="w-14 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center" min={0} max={100} />
                <span className="text-white/30 text-xs">%</span>
                <span className="text-brand font-medium">₩{depositAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">잔금 ({balanceRate}%)</span>
              <span className="text-white/70">₩{balanceAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">선금 지급 조건</label>
            <input value={depositCondition} onChange={(e) => setDepositCondition(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">잔금 지급 조건</label>
            <input value={balanceCondition} onChange={(e) => setBalanceCondition(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* 검수 */}
      <h2 className="text-white font-bold mb-3">검수 및 수정</h2>
      <div className="mb-8">
        <label className="text-white/40 text-xs mb-1.5 block">무상 수정 횟수</label>
        <input type="number" value={freeRevisionCount} onChange={(e) => setFreeRevisionCount(Number(e.target.value))} min={0} className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand" />
      </div>

      {/* 위약금 */}
      <h2 className="text-white font-bold mb-3">위약금 조건</h2>
      <div className="space-y-2 mb-8">
        {penaltyRates.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              value={p.label}
              onChange={(e) => {
                const updated = [...penaltyRates];
                updated[i] = { ...updated[i], label: e.target.value };
                setPenaltyRates(updated);
              }}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
              placeholder="조건"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={p.rate}
                onChange={(e) => {
                  const updated = [...penaltyRates];
                  updated[i] = { ...updated[i], rate: Number(e.target.value) };
                  setPenaltyRates(updated);
                }}
                className="w-16 px-2 py-2 bg-white/5 border border-white/10 rounded text-white text-sm text-center focus:outline-none focus:border-brand"
                min={0}
                max={100}
              />
              <span className="text-white/30 text-xs">%</span>
            </div>
            <button
              onClick={() => setPenaltyRates((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-white/20 hover:text-red-400 transition-colors"
              disabled={penaltyRates.length === 1}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setPenaltyRates((prev) => [...prev, { label: '', rate: 0 }])}
          className="flex items-center gap-2 text-brand text-sm hover:text-orange-400 transition-colors"
        >
          <Plus size={14} /> 조건 추가
        </button>
      </div>

      {/* 계약일 */}
      <h2 className="text-white font-bold mb-3">계약 체결일</h2>
      <div className="mb-8">
        <input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} className="w-48 px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand" />
      </div>

      {message && (
        <p className={`mb-4 text-sm ${message.includes('실패') ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={saveAgreement}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          저장
        </button>
        <button
          onClick={sendAgreement}
          disabled={sending || saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 disabled:opacity-40 transition-colors"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {agreementStatus === 'sent' ? '재발송' : '이메일 발송'}
        </button>
      </div>
    </div>
  );
}
