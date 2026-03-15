'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoModal from './VideoModal';
import type { PortfolioItem, ServiceCategory } from '@/types';

const CATEGORIES: ServiceCategory[] = [
  '전체',
  '뮤직비디오',
  '댄스비디오/퍼포먼스',
  '라이브 클립',
  '웹예능',
];

const ITEMS_PER_PAGE = 6;

export default function FeaturedWorkClient({ items }: { items: PortfolioItem[] }) {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('전체');
  const [selectedVideo, setSelectedVideo] = useState<PortfolioItem | null>(null);

  const filtered =
    activeCategory === '전체'
      ? items
      : items.filter((item) => item.category === activeCategory);

  const displayed = filtered.slice(0, ITEMS_PER_PAGE);

  return (
    <section className="py-28 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Selected Works
            </h2>
            <p className="text-white/30 text-sm mt-3">
              최근 작업 중 일부를 소개합니다
            </p>
          </div>
          <Link
            href="/portfolio"
            className="hidden sm:flex items-center gap-2 text-white/40 hover:text-brand transition-colors text-sm tracking-wide uppercase"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-brand text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div layout className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          <AnimatePresence mode="popLayout">
            {displayed.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="group cursor-pointer"
                onClick={() => setSelectedVideo(item)}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-white/5">
                  {item.thumbnail_url && (
                    <Image
                      src={item.thumbnail_url}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-brand/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                      <Play size={18} className="text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="mt-3 px-0.5">
                  <h3 className="text-white/80 text-sm font-medium line-clamp-1 group-hover:text-brand transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-white/25 text-xs mt-1">{item.category}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-white/30">
            해당 카테고리의 영상이 없습니다.
          </div>
        )}

        {filtered.length > ITEMS_PER_PAGE && (
          <div className="mt-8 text-center">
            <Link
              href={`/portfolio`}
              className="inline-flex items-center gap-2 text-white/40 hover:text-brand transition-colors text-sm tracking-wide uppercase"
            >
              +{filtered.length - ITEMS_PER_PAGE}개 더 보기 <ArrowRight size={14} />
            </Link>
          </div>
        )}

        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-white/40 hover:text-brand transition-colors text-sm tracking-wide uppercase"
          >
            View All Works <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <VideoModal
        videoId={selectedVideo?.youtube_video_id ?? null}
        title={selectedVideo?.title}
        onClose={() => setSelectedVideo(null)}
      />
    </section>
  );
}
