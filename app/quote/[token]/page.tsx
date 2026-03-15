'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Check, X, MessageSquare, Loader2, FileText, AlertCircle } from 'lucide-react';
import type { Quote, QuoteItem, Inquiry } from '@/types';

type QuoteWithInquiry = Quote & { inquiries: Inquiry };

function formatKRW(amount: number) {
  return amount.toLocaleString('ko-KR') + '원';
}

export default function QuoteViewPage() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteWithInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/quote/view?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.quote) setQuote(data.quote);
        else setError(data.error || '견적서를 찾을 수 없습니다.');
      })
      .catch(() => setError('오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(response: 'approved' | 'revision_requested' | 'rejected') {
    setResponding(true);
    try {
      const res = await fetch('/api/quote/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, response, note: note || null }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setQuote((prev) => prev ? { ...prev, client_response: response, client_response_note: note || null } : null);
      } else {
        setError(data.error);
      }
    } catch {
      setError('응답 처리 중 오류가 발생했습니다.');
    } finally {
      setResponding(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const inquiry = quote.inquiries;
  const docNumber = `RS-${String(quote.id).padStart(6, '0')}`;
  const alreadyResponded = quote.client_response && quote.client_response !== 'pending';

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-brand">REACT STUDIO</h1>
            <p className="text-white/30 text-xs mt-0.5">영상제작 프로덕션</p>
          </div>
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <FileText size={16} />
            <span>{docNumber}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Client info */}
        <div className="mb-8">
          <p className="text-white/40 text-sm">수신</p>
          <p className="text-white text-lg font-bold">
            {inquiry.name}님 {inquiry.company ? `(${inquiry.company})` : ''}
          </p>
        </div>

        {/* Meta cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            ['발행일', quote.sent_at ? new Date(quote.sent_at).toLocaleDateString('ko-KR') : new Date(quote.created_at).toLocaleDateString('ko-KR')],
            ['유효기간', quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('ko-KR') : '발행일로부터 30일'],
            ['상태', quote.status === 'sent' ? '발송완료' : '작성중'],
          ].map(([label, value]) => (
            <div key={label} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <p className="text-white/30 text-xs mb-1">{label}</p>
              <p className="text-white font-semibold text-sm">{value}</p>
            </div>
          ))}
        </div>

        {/* Items table */}
        <div className="rounded-xl border border-white/10 overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.05]">
                {['품목', '수량', '단가', '금액'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item: QuoteItem, i: number) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white text-sm">{item.name}</td>
                  <td className="px-4 py-3 text-white/60 text-sm text-center">{item.qty}</td>
                  <td className="px-4 py-3 text-white/60 text-sm text-right">{formatKRW(item.unit_price)}</td>
                  <td className="px-4 py-3 text-white text-sm text-right font-medium">{formatKRW(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">공급가액</span>
              <span className="text-white/70">{formatKRW(quote.supply_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">부가세 (10%)</span>
              <span className="text-white/70">{formatKRW(quote.vat)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-brand/30">
              <span className="text-white font-bold text-lg">합계</span>
              <span className="text-brand font-bold text-lg">{formatKRW(quote.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="p-4 rounded-xl bg-brand/5 border border-brand/20 mb-8">
            <p className="text-brand text-xs font-semibold mb-2">비고</p>
            <p className="text-white/70 text-sm whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Response section */}
        {alreadyResponded || submitted ? (
          <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
              quote.client_response === 'approved'
                ? 'bg-green-500/20 text-green-400'
                : quote.client_response === 'revision_requested'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {quote.client_response === 'approved' && <><Check size={16} /> 승인되었습니다</>}
              {quote.client_response === 'revision_requested' && <><MessageSquare size={16} /> 수정 요청이 접수되었습니다</>}
              {quote.client_response === 'rejected' && <><X size={16} /> 거절되었습니다</>}
            </div>
            {quote.client_response_note && (
              <p className="text-white/40 text-sm mt-3">{quote.client_response_note}</p>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
            <h3 className="text-white font-bold mb-4">견적서 확인</h3>

            {showNoteForm ? (
              <div className="space-y-3 mb-4">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="수정 요청사항이나 의견을 입력해주세요."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-brand resize-none"
                  rows={3}
                />
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => respond('approved')}
                disabled={responding}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                {responding ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                승인합니다
              </button>
              <button
                onClick={() => {
                  if (!showNoteForm) {
                    setShowNoteForm(true);
                    return;
                  }
                  respond('revision_requested');
                }}
                disabled={responding}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-40 transition-colors"
              >
                <MessageSquare size={16} />
                수정 요청
              </button>
              <button
                onClick={() => {
                  if (!showNoteForm) {
                    setShowNoteForm(true);
                    return;
                  }
                  respond('rejected');
                }}
                disabled={responding}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white/10 text-white/60 text-sm font-semibold rounded-lg hover:bg-white/20 disabled:opacity-40 transition-colors"
              >
                <X size={16} />
                거절
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-white/20 text-xs">React Studio | contact@reactstudio.kr</p>
        </div>
      </main>
    </div>
  );
}
