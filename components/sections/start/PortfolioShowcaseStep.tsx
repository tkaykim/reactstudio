'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import VideoModal from '@/components/sections/VideoModal';
import type { PortfolioItem, StartFormData } from '@/types';
import { SERVICE_TO_PORTFOLIO_CATEGORY } from '@/types';

interface PortfolioShowcaseStepProps {
  form: StartFormData;
  portfolioItems: PortfolioItem[];
}

export default function PortfolioShowcaseStep({ form, portfolioItems }: PortfolioShowcaseStepProps) {
  const [selectedVideo, setSelectedVideo] = useState<PortfolioItem | null>(null);

  const filteredItems = useMemo(() => {
    const categories = new Set(
      form.services
        .map((s) => SERVICE_TO_PORTFOLIO_CATEGORY[s])
        .filter(Boolean)
    );

    if (categories.size === 0) return portfolioItems.slice(0, 6);

    const matched = portfolioItems.filter((item) => categories.has(item.category));
    return matched.length > 0 ? matched.slice(0, 6) : portfolioItems.slice(0, 6);
  }, [form.services, portfolioItems]);

  return (
    <motion.div
      key="portfolio-showcase"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
        이런 스타일의 영상을 만들어 드립니다
      </h2>
      <p className="text-white/50 text-sm mb-8">
        클릭하면 영상을 미리 볼 수 있습니다. 마음에 드는 스타일이 있다면 참고해 주세요.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
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
                <div className="w-12 h-12 rounded-full bg-brand/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                  <Play size={20} className="text-white ml-0.5" />
                </div>
              </div>
              <div className="absolute top-2 left-2">
                <span className="px-2 py-0.5 rounded text-xs bg-black/60 text-white/70 backdrop-blur-sm border border-white/10">
                  {item.category}
                </span>
              </div>
            </div>
            <div className="mt-2 px-0.5">
              <h3 className="text-white font-medium text-sm line-clamp-1 group-hover:text-brand transition-colors">
                {item.title}
              </h3>
              {item.client && (
                <p className="text-white/40 text-xs mt-0.5">{item.client}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <p>포트폴리오를 준비 중입니다.</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <a
          href="/portfolio"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-brand text-sm hover:text-orange-400 transition-colors"
        >
          전체 포트폴리오 보기 <ArrowRight size={14} />
        </a>
      </div>

      <VideoModal
        videoId={selectedVideo?.youtube_video_id ?? null}
        title={selectedVideo?.title}
        onClose={() => setSelectedVideo(null)}
      />
    </motion.div>
  );
}
