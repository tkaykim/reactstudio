'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Plus, Trash2, Send, Loader2, Eye, X } from 'lucide-react';
import type { Inquiry, QuoteItem } from '@/types';
import { CompanyDocsCard, type CompanyDocKind } from '@/components/admin/CompanyDocsCard';
import { AttachDocsPicker } from '@/components/admin/AttachDocsPicker';

function calcAmounts(items: QuoteItem[]) {
  const supply = items.reduce((sum, i) => sum + i.amount, 0);
  const vat = Math.round(supply * 0.1);
  return { supply_amount: supply, vat, total_amount: supply + vat };
}

export default function QuotePage() {
  const { id: inquiryId } = useParams<{ id: string }>();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([
    { name: '', qty: 1, unit_price: 0, amount: 0 },
  ]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const [clientResponse, setClientResponse] = useState<string | null>(null);
  const [clientResponseNote, setClientResponseNote] = useState<string | null>(null);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [attachDocs, setAttachDocs] = useState<CompanyDocKind[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.from('inquiries').select('*').eq('id', inquiryId).single().then(({ data }) => {
      if (data) setInquiry(data as Inquiry);
    });
    supabase.from('quotes').select('*').eq('inquiry_id', inquiryId).order('created_at', { ascending: false }).limit(1).single().then(({ data }) => {
      if (data) {
        setSavedQuoteId(data.id);
        setItems(data.items);
        setValidUntil(data.valid_until ?? '');
        setNotes(data.notes ?? '');
        setClientResponse(data.client_response);
        setClientResponseNote(data.client_response_note);
      }
    });
  }, [inquiryId]);

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate amount
      updated[index].amount = updated[index].qty * updated[index].unit_price;
      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { name: '', qty: 1, unit_price: 0, amount: 0 }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const { supply_amount, vat, total_amount } = calcAmounts(items);

  const saveQuote = async (): Promise<number | null> => {
    setSaving(true);
    setMessage('');
    try {
      const body = {
        ...(savedQuoteId ? { id: savedQuoteId } : { inquiry_id: inquiryId }),
        items,
        supply_amount,
        vat,
        total_amount,
        valid_until: validUntil || null,
        notes,
      };
      const method = savedQuoteId ? 'PUT' : 'POST';
      const res = await fetch('/api/quote', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.quote) {
        setSavedQuoteId(data.quote.id);
        setMessage('저장되었습니다.');
        return data.quote.id;
      } else {
        setMessage('저장 실패: ' + data.error);
        return null;
      }
    } finally {
      setSaving(false);
    }
  };

  const sendQuote = async () => {
    const quoteId = await saveQuote();
    if (!quoteId) return;
    setSending(true);
    setMessage('');
    try {
      const res = await fetch('/api/quote/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, ccEmails, attachDocs }),
      });
      const data = await res.json();
      setMessage(data.success ? '견적서가 고객 이메일로 발송되었습니다.' : '발송 실패: ' + data.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">견적서 작성</h1>
        {inquiry && (
          <div className="text-right">
            <p className="text-white font-medium">{inquiry.name}</p>
            <p className="text-white/40 text-sm">{inquiry.email}</p>
          </div>
        )}
      </div>

      {clientResponse && clientResponse !== 'pending' && (
        <div className={`mb-6 p-4 rounded-xl border ${
          clientResponse === 'approved'
            ? 'bg-green-500/10 border-green-500/30'
            : clientResponse === 'revision_requested'
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <p className={`font-semibold text-sm ${
            clientResponse === 'approved' ? 'text-green-400'
            : clientResponse === 'revision_requested' ? 'text-yellow-400'
            : 'text-red-400'
          }`}>
            고객 응답: {clientResponse === 'approved' ? '승인' : clientResponse === 'revision_requested' ? '수정 요청' : '거절'}
          </p>
          {clientResponseNote && (
            <p className="text-white/60 text-sm mt-1">{clientResponseNote}</p>
          )}
        </div>
      )}

      {clientResponse === 'pending' && (
        <div className="mb-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <p className="text-blue-400 text-sm font-medium">견적서 발송 완료 — 고객 응답 대기 중</p>
        </div>
      )}

      {/* Items table */}
      <div className="rounded-xl border border-white/10 overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              {['품목', '수량', '단가', '금액', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="px-3 py-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                    placeholder="품목명"
                    className="w-full bg-transparent text-white text-sm outline-none placeholder:text-white/20"
                  />
                </td>
                <td className="px-3 py-2 w-16">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(i, 'qty', Number(e.target.value))}
                    className="w-full bg-transparent text-white text-sm outline-none text-center"
                    min={1}
                  />
                </td>
                <td className="px-3 py-2 w-32">
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                    className="w-full bg-transparent text-white text-sm outline-none text-right"
                    step={10000}
                  />
                </td>
                <td className="px-3 py-2 w-32 text-white/70 text-sm text-right">
                  {item.amount.toLocaleString()}원
                </td>
                <td className="px-3 py-2 w-8">
                  <button
                    onClick={() => removeItem(i)}
                    className="text-white/20 hover:text-red-400 transition-colors"
                    disabled={items.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={addItem}
            className="flex items-center gap-2 text-brand text-sm hover:text-orange-400 transition-colors"
          >
            <Plus size={14} /> 항목 추가
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-56 space-y-1.5">
          {[
            ['공급가액', supply_amount],
            ['부가세 (10%)', vat],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between text-sm">
              <span className="text-white/40">{label}</span>
              <span className="text-white/70">{(value as number).toLocaleString()}원</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-brand/30">
            <span className="text-white font-bold">합계</span>
            <span className="text-brand font-bold">{total_amount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">견적 유효기간</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">비고</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="특이사항 또는 조건"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand placeholder:text-white/20"
          />
        </div>
      </div>

      {/* CC emails */}
      <div className="mb-6">
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

      <div className="mb-6">
        <CompanyDocsCard />
        <AttachDocsPicker
          value={attachDocs}
          onChange={setAttachDocs}
          primaryLabel="견적서 PDF"
          primaryHint="견적서를 PDF 첨부파일로 발송"
        />
      </div>

      {message && (
        <p className={`mb-4 text-sm ${message.includes('실패') || message.includes('오류') ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={saveQuote}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white text-sm font-semibold rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          저장
        </button>
        <button
          onClick={sendQuote}
          disabled={sending}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 disabled:opacity-40 transition-colors"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          이메일 발송
        </button>
      </div>
    </div>
  );
}
