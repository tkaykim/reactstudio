'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import SignaturePad from 'signature_pad';
import { Check, RotateCcw, Loader2, AlertCircle, FileSignature, Calendar, CreditCard } from 'lucide-react';
import type { Contract, QuoteItem } from '@/types';

function formatKRW(amount: number) {
  return amount.toLocaleString('ko-KR') + '원';
}

export default function ContractSignPage() {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    fetch(`/api/contract/view?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.contract) setContract(data.contract);
        else setError(data.error || '계약서를 찾을 수 없습니다.');
      })
      .catch(() => setError('오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [token]);

  const initSignaturePad = useCallback((node: HTMLCanvasElement | null) => {
    if (node && !signaturePadRef.current) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      node.width = node.offsetWidth * ratio;
      node.height = node.offsetHeight * ratio;
      const ctx = node.getContext('2d');
      if (ctx) ctx.scale(ratio, ratio);

      signaturePadRef.current = new SignaturePad(node, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: '#000000',
      });
      canvasRef.current = node;
    }
  }, []);

  function clearSignature() {
    signaturePadRef.current?.clear();
  }

  async function submitSignature() {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError('서명을 해주세요.');
      return;
    }
    if (!agreed) {
      setError('계약 조건에 동의해주세요.');
      return;
    }
    setError('');
    setSigning(true);

    try {
      const signatureData = signaturePadRef.current.toDataURL('image/png');
      const res = await fetch('/api/contract/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signatureData }),
      });
      const data = await res.json();
      if (data.success) {
        setSigned(true);
        setContract((prev) => prev ? { ...prev, status: 'signed', client_signature_data: signatureData } : null);
      } else {
        setError(data.error);
      }
    } catch {
      setError('서명 처리 중 오류가 발생했습니다.');
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const alreadySigned = contract.status === 'signed' || !!contract.client_signature_data;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-brand">REACT STUDIO</h1>
            <p className="text-white/30 text-xs mt-0.5">계약서</p>
          </div>
          <span className="text-white/30 text-sm">RS-C{String(contract.id).padStart(5, '0')}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Title */}
        <h2 className="text-2xl font-black text-white mb-2">{contract.title}</h2>
        <p className="text-white/40 text-sm mb-8">
          {contract.client_name}님 {contract.client_company ? `(${contract.client_company})` : ''}
        </p>

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: Calendar, label: '계약 기간', value: contract.start_date && contract.end_date ? `${contract.start_date} ~ ${contract.end_date}` : '별도 협의' },
            { icon: CreditCard, label: '공급가액', value: formatKRW(contract.supply_amount) },
            { icon: CreditCard, label: '부가세 (10%)', value: formatKRW(contract.vat) },
            { icon: CreditCard, label: '합계 (VAT 포함)', value: formatKRW(contract.total_amount) },
            { icon: CreditCard, label: '선금', value: formatKRW(contract.deposit_amount) },
            { icon: CreditCard, label: '잔금', value: formatKRW(contract.balance_amount) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-1 text-white/30 text-xs mb-1">
                <Icon size={10} /> {label}
              </div>
              <p className="text-white font-semibold text-sm">{value}</p>
            </div>
          ))}
        </div>

        {/* Items */}
        {contract.items && contract.items.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.05]">
                  {['항목', '수량', '단가', '금액'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contract.items.map((item: QuoteItem, i: number) => (
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
        )}

        {/* Terms */}
        {contract.terms && (
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 mb-8">
            <h3 className="text-white font-bold text-sm mb-3">계약 조건</h3>
            <p className="text-white/50 text-sm whitespace-pre-wrap leading-relaxed">{contract.terms}</p>
          </div>
        )}

        {/* Signature section */}
        {alreadySigned || signed ? (
          <div className="p-6 rounded-xl border border-green-500/30 bg-green-500/5 text-center">
            <Check size={32} className="text-green-400 mx-auto mb-3" />
            <p className="text-green-400 font-bold text-lg">서명이 완료되었습니다</p>
            <p className="text-white/40 text-sm mt-2">계약서 서명이 정상적으로 처리되었습니다. 감사합니다.</p>
            {contract.client_signature_data && (
              <div className="mt-4 inline-block p-3 bg-white rounded-lg">
                <img src={contract.client_signature_data} alt="서명" className="h-16" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <FileSignature size={18} className="text-brand" /> 서명
            </h3>

            {/* Agreement checkbox */}
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-brand" />
              <span className="text-white/60 text-sm">
                위 계약 내용을 확인하였으며, 계약 조건에 동의합니다.
              </span>
            </label>

            {/* Signature canvas */}
            <div className="relative mb-3">
              <canvas
                ref={initSignaturePad}
                className="w-full h-40 border border-white/20 rounded-lg bg-white cursor-crosshair"
                style={{ touchAction: 'none' }}
              />
              <button
                onClick={clearSignature}
                className="absolute top-2 right-2 p-1.5 bg-gray-100 rounded text-gray-500 hover:bg-gray-200 transition-colors"
                title="지우기"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <p className="text-white/20 text-xs mb-4">위 영역에 서명해주세요. (마우스 또는 터치)</p>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              onClick={submitSignature}
              disabled={signing || !agreed}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              {signing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              서명 완료
            </button>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-white/20 text-xs">React Studio | contact@reactstudio.kr</p>
        </div>
      </main>
    </div>
  );
}
