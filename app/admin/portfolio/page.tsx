'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Link as LinkIcon,
  GripVertical,
} from 'lucide-react';
import type { PortfolioItem, ServiceCategory } from '@/types';
import { SERVICE_CATEGORIES, CURRENT_BU_CODE } from '@/types';

const categories = SERVICE_CATEGORIES.filter((c) => c !== '전체');

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [addCategory, setAddCategory] = useState<string>(categories[0]);
  const [addResult, setAddResult] = useState('');
  const [filterCategory, setFilterCategory] = useState<ServiceCategory>('전체');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const supabase = createSupabaseBrowserClient();

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('portfolio_items')
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

  const filteredItems =
    filterCategory === '전체'
      ? items
      : items.filter((i) => i.category === filterCategory);

  async function addVideo() {
    if (!youtubeUrl.trim()) return;
    setAdding(true);
    setAddResult('');

    try {
      const res = await fetch(`/api/youtube?url=${encodeURIComponent(youtubeUrl.trim())}`);
      const info = await res.json();

      if (!res.ok) {
        setAddResult(info.error || '영상 정보를 가져올 수 없습니다.');
        setAdding(false);
        return;
      }

      const { data: existing } = await supabase
        .from('portfolio_items')
        .select('id')
        .eq('bu_code', CURRENT_BU_CODE)
        .eq('youtube_video_id', info.videoId)
        .single();

      if (existing) {
        setAddResult('이미 등록된 영상입니다.');
        setAdding(false);
        return;
      }

      const maxOrder = items.reduce((max, i) => Math.max(max, i.display_order), 0);

      await supabase.from('portfolio_items').insert({
        bu_code: CURRENT_BU_CODE,
        youtube_video_id: info.videoId,
        youtube_playlist_id: null,
        title: info.title,
        thumbnail_url: info.thumbnailUrl,
        category: addCategory,
        is_visible: true,
        display_order: maxOrder + 1,
      });

      setYoutubeUrl('');
      setAddResult('');
      await loadItems();
    } catch {
      setAddResult('오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  }

  async function deleteItem(id: number) {
    if (!confirm('이 영상을 삭제하시겠습니까?')) return;
    await supabase.from('portfolio_items').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function toggleVisibility(item: PortfolioItem) {
    await supabase
      .from('portfolio_items')
      .update({ is_visible: !item.is_visible })
      .eq('id', item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_visible: !i.is_visible } : i))
    );
  }

  async function updateCategory(id: number, category: string) {
    await supabase.from('portfolio_items').update({ category }).eq('id', id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, category } : i)));
  }

  async function updateClient(id: number, client: string) {
    const value = client.trim() || null;
    await supabase.from('portfolio_items').update({ client: value }).eq('id', id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, client: value } : i)));
  }

  async function moveItem(id: number, direction: 'up' | 'down') {
    const currentList = filterCategory === '전체' ? items : items;
    const idx = currentList.findIndex((i) => i.id === id);
    if (idx < 0) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= currentList.length) return;

    const current = currentList[idx];
    const target = currentList[swapIdx];

    const batch = [
      supabase.from('portfolio_items').update({ display_order: target.display_order }).eq('id', current.id),
      supabase.from('portfolio_items').update({ display_order: current.display_order }).eq('id', target.id),
    ];
    await Promise.all(batch);

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

    const list = [...filteredItems];
    const [moved] = list.splice(dragIdx, 1);
    list.splice(targetIdx, 0, moved);

    const updates = list.map((item, i) => ({
      id: item.id,
      display_order: i + 1,
    }));

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
        supabase.from('portfolio_items').update({ display_order: u.display_order }).eq('id', u.id)
      )
    );

    setDragIdx(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6">포트폴리오 관리</h1>

      {/* Add video panel */}
      <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] mb-8">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2">
          <Plus size={16} className="text-brand" />
          영상 추가
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => { setYoutubeUrl(e.target.value); setAddResult(''); }}
              onKeyDown={(e) => e.key === 'Enter' && addVideo()}
              placeholder="YouTube 링크 붙여넣기 (예: https://youtu.be/xxxxx)"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/20 focus:outline-none focus:border-brand text-sm"
            />
          </div>
          <select
            value={addCategory}
            onChange={(e) => setAddCategory(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-brand"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={addVideo}
            disabled={adding || !youtubeUrl.trim()}
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

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SERVICE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              filterCategory === cat
                ? 'bg-brand text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {cat}
            <span className="ml-1 opacity-60">
              {cat === '전체' ? items.length : items.filter((i) => i.category === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Items list */}
      {loading ? (
        <div className="text-center py-12 text-white/30">
          <Loader2 size={24} className="animate-spin mx-auto" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          {items.length === 0
            ? 'YouTube 링크를 추가하여 포트폴리오를 구성해주세요.'
            : '해당 카테고리의 영상이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item, idx) => (
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

              {/* Thumbnail */}
              <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-white/5 shrink-0">
                {item.thumbnail_url && (
                  <Image
                    src={item.thumbnail_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-white text-sm font-medium line-clamp-1">{item.title}</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={item.category}
                    onChange={(e) => updateCategory(item.id, e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white/70 text-xs focus:outline-none focus:border-brand"
                  >
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="text"
                    defaultValue={item.client ?? ''}
                    onBlur={(e) => updateClient(item.id, e.target.value)}
                    placeholder="Client"
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white/70 text-xs placeholder:text-white/20 focus:outline-none focus:border-brand w-36"
                  />
                </div>
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
                  disabled={idx === filteredItems.length - 1}
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
                onClick={() => deleteItem(item.id)}
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
