'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  Plus,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Upload,
  Link as LinkIcon,
} from 'lucide-react';
import type { Client } from '@/types';
import { CURRENT_BU_CODE } from '@/types';

type LogoInputMode = 'upload' | 'url';

export default function AdminClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [clientName, setClientName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<LogoInputMode>('upload');
  const [addResult, setAddResult] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createSupabaseBrowserClient();

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('bu_code', CURRENT_BU_CODE)
      .order('display_order', { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAddResult('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setAddResult('');
  }

  async function uploadLogo(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from('client-logos')
      .upload(fileName, file, { contentType: file.type });

    if (error) return null;

    const { data } = supabase.storage
      .from('client-logos')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function addClient() {
    if (!clientName.trim()) {
      setAddResult('클라이언트 이름을 입력해주세요.');
      return;
    }

    setAdding(true);
    setAddResult('');

    try {
      let finalLogoUrl = '';

      if (inputMode === 'upload') {
        if (!logoFile) {
          setAddResult('로고 이미지를 선택해주세요.');
          setAdding(false);
          return;
        }
        const uploaded = await uploadLogo(logoFile);
        if (!uploaded) {
          setAddResult('로고 업로드에 실패했습니다.');
          setAdding(false);
          return;
        }
        finalLogoUrl = uploaded;
      } else {
        if (!logoUrl.trim()) {
          setAddResult('로고 URL을 입력해주세요.');
          setAdding(false);
          return;
        }
        finalLogoUrl = logoUrl.trim();
      }

      const maxOrder = items.reduce((max, i) => Math.max(max, i.display_order), 0);

      const { error } = await supabase.from('clients').insert({
        bu_code: CURRENT_BU_CODE,
        name: clientName.trim(),
        logo_url: finalLogoUrl,
        is_visible: true,
        display_order: maxOrder + 1,
      });

      if (error) {
        setAddResult('추가에 실패했습니다.');
        setAdding(false);
        return;
      }

      setClientName('');
      setLogoUrl('');
      setLogoFile(null);
      setLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setAddResult('');
      await loadItems();
    } catch {
      setAddResult('오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  }

  async function deleteItem(item: Client) {
    if (!confirm(`"${item.name}" 클라이언트를 삭제하시겠습니까?`)) return;

    const url = item.logo_url;
    if (url.includes('client-logos')) {
      const parts = url.split('/client-logos/');
      if (parts[1]) {
        await supabase.storage.from('client-logos').remove([parts[1]]);
      }
    }

    await supabase.from('clients').delete().eq('id', item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function toggleVisibility(item: Client) {
    await supabase
      .from('clients')
      .update({ is_visible: !item.is_visible })
      .eq('id', item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_visible: !i.is_visible } : i))
    );
  }

  async function updateName(id: number, name: string) {
    const value = name.trim();
    if (!value) return;
    await supabase.from('clients').update({ name: value }).eq('id', id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: value } : i)));
  }

  async function moveItem(id: number, direction: 'up' | 'down') {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const current = items[idx];
    const target = items[swapIdx];

    await Promise.all([
      supabase.from('clients').update({ display_order: target.display_order }).eq('id', current.id),
      supabase.from('clients').update({ display_order: current.display_order }).eq('id', target.id),
    ]);

    setItems((prev) => {
      const updated = prev.map((i) => {
        if (i.id === current.id) return { ...i, display_order: target.display_order };
        if (i.id === target.id) return { ...i, display_order: current.display_order };
        return i;
      });
      return updated.sort((a, b) => a.display_order - b.display_order);
    });
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  async function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      return;
    }

    const list = [...items];
    const [moved] = list.splice(dragIdx, 1);
    list.splice(targetIdx, 0, moved);

    const updates = list.map((item, i) => ({ id: item.id, display_order: i + 1 }));

    setItems((prev) => {
      const updatedMap = new Map(updates.map((u) => [u.id, u.display_order]));
      const newItems = prev.map((item) =>
        updatedMap.has(item.id)
          ? { ...item, display_order: updatedMap.get(item.id)! }
          : item
      );
      return newItems.sort((a, b) => a.display_order - b.display_order);
    });

    await Promise.all(
      updates.map((u) =>
        supabase.from('clients').update({ display_order: u.display_order }).eq('id', u.id)
      )
    );

    setDragIdx(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6">클라이언트 관리</h1>

      {/* Add client panel */}
      <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] mb-8">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2">
          <Plus size={16} className="text-brand" />
          클라이언트 추가
        </h2>

        <div className="space-y-4">
          {/* Name input */}
          <input
            type="text"
            value={clientName}
            onChange={(e) => { setClientName(e.target.value); setAddResult(''); }}
            placeholder="클라이언트 이름"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand text-sm"
          />

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                inputMode === 'upload'
                  ? 'bg-brand text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Upload size={12} />
              파일 업로드
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                inputMode === 'url'
                  ? 'bg-brand text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <LinkIcon size={12} />
              URL 입력
            </button>
          </div>

          {/* Logo input */}
          {inputMode === 'upload' ? (
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1 text-sm text-white/50 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-white/10 file:text-white/70 hover:file:bg-white/20 file:cursor-pointer file:transition-colors"
              />
              {logoPreview && (
                <div className="relative w-12 h-12 rounded border border-white/10 overflow-hidden bg-white/5 shrink-0">
                  <Image src={logoPreview} alt="Preview" fill className="object-contain p-1" sizes="48px" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => { setLogoUrl(e.target.value); setAddResult(''); }}
                  placeholder="로고 이미지 URL (예: https://example.com/logo.png)"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand text-sm"
                />
              </div>
              {logoUrl.trim() && (
                <div className="relative w-12 h-12 rounded border border-white/10 overflow-hidden bg-white/5 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                </div>
              )}
            </div>
          )}

          <button
            onClick={addClient}
            disabled={adding || !clientName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 disabled:opacity-40 transition-colors"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            추가
          </button>
        </div>

        {addResult && (
          <p className="mt-3 text-sm text-red-400">{addResult}</p>
        )}
      </div>

      {/* Items list */}
      {loading ? (
        <div className="text-center py-12 text-white/30">
          <Loader2 size={24} className="animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          클라이언트를 추가하여 Work With 섹션을 구성해주세요.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                dragIdx === idx
                  ? 'border-brand/50 bg-brand/5'
                  : item.is_visible
                    ? 'border-white/10 bg-white/[0.02]'
                    : 'border-white/5 bg-white/[0.01] opacity-50'
              }`}
            >
              {/* Drag handle */}
              <div className="cursor-grab text-white/20 hover:text-white/50 transition-colors shrink-0">
                <GripVertical size={18} />
              </div>

              {/* Logo preview */}
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.logo_url}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain p-1"
                />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  defaultValue={item.name}
                  onBlur={(e) => updateName(item.id, e.target.value)}
                  className="bg-transparent text-white text-sm font-medium focus:outline-none focus:border-b focus:border-brand w-full"
                />
              </div>

              {/* Order controls */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveItem(item.id, 'up')}
                  disabled={idx === 0}
                  className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="위로"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveItem(item.id, 'down')}
                  disabled={idx === items.length - 1}
                  className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="아래로"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Visibility toggle */}
              <button
                onClick={() => toggleVisibility(item)}
                className={`p-1.5 rounded transition-colors shrink-0 ${
                  item.is_visible
                    ? 'text-green-400 hover:bg-green-400/10'
                    : 'text-white/30 hover:bg-white/5'
                }`}
                title={item.is_visible ? '숨기기' : '표시하기'}
              >
                {item.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteItem(item)}
                className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                title="삭제"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
