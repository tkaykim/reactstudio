'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { RefreshCw, Eye, EyeOff, Loader2, Plus } from 'lucide-react';
import type { PortfolioItem } from '@/types';
import { SERVICE_CATEGORIES } from '@/types';

const categories = SERVICE_CATEGORIES.filter((c) => c !== '전체');

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [playlistId, setPlaylistId] = useState('');
  const [syncCategory, setSyncCategory] = useState('뮤직비디오');
  const [syncResult, setSyncResult] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('bu_code', 'REACT')
      .order('display_order', { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  }

  async function syncPlaylist() {
    if (!playlistId.trim()) return;
    setSyncing(true);
    setSyncResult('');
    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: playlistId.trim(), category: syncCategory }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`동기화 완료: 추가 ${data.added}개, 업데이트 ${data.updated}개`);
        loadItems();
      } else {
        setSyncResult('동기화 실패: ' + data.error);
      }
    } catch {
      setSyncResult('오류가 발생했습니다.');
    } finally {
      setSyncing(false);
    }
  }

  async function toggleVisibility(item: PortfolioItem) {
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from('portfolio_items')
      .update({ is_visible: !item.is_visible })
      .eq('id', item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_visible: !i.is_visible } : i))
    );
  }

  async function updateCategory(id: number, category: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('portfolio_items').update({ category }).eq('id', id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, category } : i)));
  }

  async function updateOrder(id: number, order: number) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('portfolio_items').update({ display_order: order }).eq('id', id);
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, display_order: order } : i))
        .sort((a, b) => a.display_order - b.display_order)
    );
  }

  async function updateClient(id: number, client: string) {
    const supabase = createSupabaseBrowserClient();
    const value = client.trim() || null;
    await supabase.from('portfolio_items').update({ client: value }).eq('id', id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, client: value } : i)));
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6">포트폴리오 관리</h1>

      {/* Sync panel */}
      <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] mb-8">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2">
          <Plus size={16} className="text-brand" />
          YouTube 동기화
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={playlistId}
            onChange={(e) => setPlaylistId(e.target.value)}
            placeholder="YouTube 플레이리스트 ID (PLxx...)"
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand text-sm"
          />
          <select
            value={syncCategory}
            onChange={(e) => setSyncCategory(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={syncPlaylist}
            disabled={syncing || !playlistId.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded hover:bg-orange-600 disabled:opacity-40 transition-colors"
          >
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            동기화
          </button>
        </div>
        {syncResult && (
          <p className={`mt-3 text-sm ${syncResult.includes('실패') || syncResult.includes('오류') ? 'text-red-400' : 'text-green-400'}`}>
            {syncResult}
          </p>
        )}
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="text-center py-12 text-white/30">
          <Loader2 size={24} className="animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          YouTube 플레이리스트를 동기화하여 영상을 추가해주세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                item.is_visible ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 bg-white/[0.01] opacity-50'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-white/5">
                {item.thumbnail_url && (
                  <Image
                    src={item.thumbnail_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                )}
              </div>

              {/* Controls */}
              <div className="p-3 space-y-2">
                <p className="text-white text-sm font-medium line-clamp-1">{item.title}</p>

                <input
                  type="text"
                  defaultValue={item.client ?? ''}
                  onBlur={(e) => updateClient(item.id, e.target.value)}
                  placeholder="Client (예: P NATION Ent)"
                  className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white/70 text-xs placeholder:text-white/20 focus:outline-none focus:border-brand"
                />

                <div className="flex gap-2">
                  <select
                    value={item.category}
                    onChange={(e) => updateCategory(item.id, e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white/70 text-xs focus:outline-none focus:border-brand"
                  >
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <input
                    type="number"
                    value={item.display_order}
                    onChange={(e) => updateOrder(item.id, Number(e.target.value))}
                    className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white/70 text-xs text-center focus:outline-none focus:border-brand"
                    title="표시 순서"
                  />

                  <button
                    onClick={() => toggleVisibility(item)}
                    className={`p-1.5 rounded transition-colors ${
                      item.is_visible
                        ? 'text-green-400 hover:bg-green-400/10'
                        : 'text-white/30 hover:bg-white/5'
                    }`}
                    title={item.is_visible ? '숨기기' : '표시하기'}
                  >
                    {item.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
