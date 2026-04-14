'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Plus, Trash2, Save, Loader2, Send, X } from 'lucide-react';
import { CONTRACT_TYPES } from '@/types';
import type { QuoteItem, Inquiry } from '@/types';

function calcAmounts(items: QuoteItem[]) {
  return items.reduce((sum, i) => sum + i.amount, 0);
}

export default function NewContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get('inquiry_id');
  const editId = searchParams.get('edit');

  const [title, setTitle] = useState('');
  const [contractType, setContractType] = useState('service');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([{ name: '', qty: 1, unit_price: 0, amount: 0 }]);
  const [depositRate, setDepositRate] = useState(50);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [terms, setTerms] = useState(
    '1. 본 견적의 범위는 상기 명시된 항목에 한합니다.\n2. 선금은 견적 확인 후 7일 이내에 입금해주셔야 합니다.\n3. 잔금은 최종 결과물 납품 후 7일 이내에 입금해주셔야 합니다.\n4. 중도 취소 시 진행된 작업에 대한 비용은 정산됩니다.'
  );
  const [linkedInquiryId, setLinkedInquiryId] = useState<number | null>(inquiryId ? Number(inquiryId) : null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [contractStatus, setContractStatus] = useState('draft');
  const [message, setMessage] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    function loadContract(data: Record<string, unknown>) {
      setTitle(data.title as string);
      setContractType(data.contract_type as string);
      setClientName(data.client_name as string);
      setClientEmail(data.client_email as string);
      setClientPhone((data.client_phone as string) || '');
      setClientCompany((data.client_company as string) || '');
      const contractItems = data.items as QuoteItem[] | null;
      setItems(contractItems?.length ? contractItems : [{ name: '', qty: 1, unit_price: 0, amount: 0 }]);
      setStartDate((data.start_date as string) || '');
      setEndDate((data.end_date as string) || '');
      setTerms((data.terms as string) || '');
      setContractStatus((data.status as string) || 'draft');
      const total = data.total_amount as number;
      const deposit = data.deposit_amount as number;
      if (total > 0 && deposit > 0) {
        setDepositRate(Math.round((deposit / total) * 100));
      }
      if (data.inquiry_id) {
        setLinkedInquiryId(data.inquiry_id as number);
      }
    }

    if (editId) {
      supabase.from('contracts').select('*').eq('id', editId).single().then(({ data }) => {
        if (data) loadContract(data);
      });
      return;
    }

    if (inquiryId) {
      supabase
        .from('contracts')
        .select('*')
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data: existingContract }) => {
          if (existingContract) {
            loadContract(existingContract);
            router.replace(`/admin/contracts/new?edit=${existingContract.id}`);
          } else {
            supabase.from('inquiries').select('*').eq('id', inquiryId).single().then(({ data }) => {
              if (data) {
                const inq = data as Inquiry;
                setClientName(inq.name);
                setClientEmail(inq.email);
                setClientPhone(inq.phone);
                setClientCompany(inq.company || '');
                setTitle(`${inq.company || inq.name} - ${inq.services?.[0] || '영상 제작'}`);
              }
            });
          }
        });
    }
  }, [editId, inquiryId, router]);

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      updated[index].amount = updated[index].qty * updated[index].unit_price;
      return updated;
    });
  };

  const supplyAmount = calcAmounts(items);
  const vatAmount = Math.round(supplyAmount * 0.1);
  const totalAmount = supplyAmount + vatAmount;
  const depositAmount = Math.round(totalAmount * (depositRate / 100));
  const balanceAmount = totalAmount - depositAmount;

  async function saveContract(): Promise<number | null> {
    if (!title || !clientName || !clientEmail) {
      setMessage('견적명, 고객명, 이메일은 필수입니다.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      const body = {
        ...(editId ? { id: Number(editId) } : {}),
        title,
        contract_type: contractType,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || null,
        client_company: clientCompany || null,
        inquiry_id: linkedInquiryId,
        items,
        supply_amount: supplyAmount,
        vat: vatAmount,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        start_date: startDate || null,
        end_date: endDate || null,
        terms,
      };

      const res = await fetch('/api/contract', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.contract) {
        setMessage('저장되었습니다.');
        if (!editId) {
          router.push(`/admin/contracts/new?edit=${data.contract.id}`);
        }
        return data.contract.id;
      } else {
        setMessage('저장 실패: ' + data.error);
        return null;
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendContract() {
    let contractId = editId ? Number(editId) : null;
    if (!contractId) {
      contractId = await saveContract();
      if (!contractId) return;
    } else {
      const savedId = await saveContract();
      if (!savedId) return;
    }
    setSending(true);
    setMessage('');
    try {
      const res = await fetch('/api/contract/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, ccEmails }),
      });
      const data = await res.json();
      if (data.success) {
        setContractStatus('sent');
        setMessage('견적서가 고객 이메일로 발송되었습니다.');
      } else {
        setMessage('발송 실패: ' + data.error);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black text-white mb-6">{editId ? '견적서 수정' : '새 견적서 작성'}</h1>

      {/* Basic info */}
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">견적명 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: OOO 뮤직비디오 제작" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand placeholder:text-white/20" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">견적 유형</label>
            <select value={contractType} onChange={(e) => setContractType(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand">
              {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-neutral-900 text-white">{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">고객명 *</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">이메일 *</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">전화번호</label>
            <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">회사명</label>
            <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand" />
          </div>
        </div>

        {/* CC emails */}
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">참조 (CC)</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const email = ccInput.trim();
                  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !ccEmails.includes(email)) {
                    setCcEmails((prev) => [...prev, email]);
                    setCcInput('');
                  }
                }
              }}
              placeholder="이메일 입력 후 Enter 또는 추가 버튼"
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand placeholder:text-white/20"
            />
            <button
              type="button"
              onClick={() => {
                const email = ccInput.trim();
                if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !ccEmails.includes(email)) {
                  setCcEmails((prev) => [...prev, email]);
                  setCcInput('');
                }
              }}
              className="px-3 py-2 bg-white/10 text-white/60 text-sm rounded hover:bg-white/20 transition-colors"
            >
              추가
            </button>
          </div>
          {ccEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {ccEmails.map((email) => (
                <span key={email} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 text-white/70 text-xs rounded-full">
                  {email}
                  <button onClick={() => setCcEmails((prev) => prev.filter((e) => e !== email))} className="text-white/30 hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">시작일</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">종료일</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand" />
          </div>
        </div>
      </div>

      {/* Items table */}
      <h2 className="text-white font-bold mb-3">견적 항목</h2>
      <div className="rounded-xl border border-white/10 overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              {['항목', '수량', '단가', '금액', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="px-3 py-2"><input value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)} placeholder="항목명" className="w-full bg-transparent text-white text-sm outline-none placeholder:text-white/20" /></td>
                <td className="px-3 py-2 w-16"><input type="number" value={item.qty} onChange={(e) => updateItem(i, 'qty', Number(e.target.value))} className="w-full bg-transparent text-white text-sm outline-none text-center" min={1} /></td>
                <td className="px-3 py-2 w-32"><input type="number" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))} className="w-full bg-transparent text-white text-sm outline-none text-right" step={10000} /></td>
                <td className="px-3 py-2 w-32 text-white/70 text-sm text-right">{item.amount.toLocaleString()}원</td>
                <td className="px-3 py-2 w-8"><button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="text-white/20 hover:text-red-400 transition-colors" disabled={items.length === 1}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t border-white/5">
          <button onClick={() => setItems((p) => [...p, { name: '', qty: 1, unit_price: 0, amount: 0 }])} className="flex items-center gap-2 text-brand text-sm hover:text-orange-400 transition-colors">
            <Plus size={14} /> 항목 추가
          </button>
        </div>
      </div>

      {/* Totals + deposit */}
      <div className="flex justify-end mb-6">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/40">공급가액</span>
            <span className="text-white/70">{supplyAmount.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">부가세 (10%)</span>
            <span className="text-white/70">{vatAmount.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-brand/30">
            <span className="text-white font-bold">합계 (VAT 포함)</span>
            <span className="text-brand font-bold">{totalAmount.toLocaleString()}원</span>
          </div>
          <div className="flex items-center justify-between text-sm gap-2 pt-2 border-t border-white/5">
            <span className="text-white/40">선금</span>
            <div className="flex items-center gap-2">
              <input type="number" value={depositRate} onChange={(e) => setDepositRate(Number(e.target.value))} className="w-14 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center" min={0} max={100} />
              <span className="text-white/30 text-xs">%</span>
              <span className="text-white/70">{depositAmount.toLocaleString()}원</span>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">잔금</span>
            <span className="text-white/70">{balanceAmount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="mb-6">
        <label className="text-white/40 text-xs mb-1.5 block">특이사항</label>
        <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={6} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand resize-none placeholder:text-white/20" />
      </div>

      {message && (
        <p className={`mb-4 text-sm ${message.includes('실패') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
      )}

      <div className="flex gap-3">
        <button onClick={saveContract} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded hover:bg-white/20 disabled:opacity-40 transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          저장
        </button>
        <button onClick={sendContract} disabled={sending || saving} className="flex items-center gap-2 px-6 py-3 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 disabled:opacity-40 transition-colors">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {contractStatus === 'sent' ? '재발송' : '이메일 발송'}
        </button>
      </div>
    </div>
  );
}
