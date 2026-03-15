'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import VideoModal from './VideoModal';
import type { PortfolioItem, ServiceCategory } from '@/types';

const CATEGORIES: ServiceCategory[] = [
  '전체',
  '뮤직비디오',
  '댄스비디오/퍼포먼스',
  '라이브 클립',
  '웹예능',
];

interface PortfolioGridProps {
  items: PortfolioItem[];
}

export default function PortfolioGrid({ items }: PortfolioGridProps) {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('전체');
  const [selectedVideo, setSelectedVideo] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    const playId = searchParams.get('play');
    if (playId) {
      const item = items.find((i) => i.youtube_video_id === playId);
      if (item) setSelectedVideo(item);
    }
  }, [searchParams, items]);

  const filtered =
    activeCategory === '전체'
      ? items
      : items.filter((item) => item.category === activeCategory);

  return (
    <>
      {/* Filter tabs */}
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
      <motion.div
        layout
        className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((item) => (
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
                {item.thumbnail_url ? (
                  <Image
                    src={item.thumbnail_url}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-white/5" />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-brand/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                    <Play size={22} className="text-white ml-1" />
                  </div>
                </div>

                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-black/60 text-white/70 backdrop-blur-sm border border-white/10">
                    {item.category}
                  </span>
                </div>
              </div>

              <div className="mt-3 px-1">
                <h3 className="text-white font-medium text-sm line-clamp-1 group-hover:text-brand transition-colors">
                  {item.title}
                </h3>
                {item.client && (
                  <p className="text-white/40 text-xs mt-1">
                    Client: {item.client}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-24 text-white/30">
          해당 카테고리의 영상이 없습니다.
        </div>
      )}

      <VideoModal
        videoId={selectedVideo?.youtube_video_id ?? null}
        title={selectedVideo?.title}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
