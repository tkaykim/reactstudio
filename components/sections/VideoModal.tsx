'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PortfolioItem } from '@/types';

interface VideoModalProps {
  item: PortfolioItem | null;
  onClose: () => void;
}

export default function VideoModal({ item, onClose }: VideoModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (item) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [item]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleInquiry = () => {
    if (!item) return;
    const params = new URLSearchParams();
    params.set('ref_video', item.youtube_video_id);
    params.set('ref_title', item.title);
    if (item.category) params.set('ref_category', item.category);
    onClose();
    router.push(`/contact?${params.toString()}`);
  };

  const creditTags = item?.credits
    ? item.credits.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-1 right-0 z-10 text-white/60 hover:text-white transition-colors p-1"
              aria-label="닫기"
            >
              <X size={24} />
            </button>

            {/* Video */}
            <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${item.youtube_video_id}?autoplay=1&rel=0`}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Info + CTA */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              {/* Left: meta info */}
              <div className="space-y-2 min-w-0">
                <span className="inline-block px-2.5 py-0.5 rounded-sm text-xs font-medium bg-brand/20 text-brand border border-brand/30">
                  {item.category}
                </span>

                <h3 className="text-white text-lg sm:text-xl font-bold leading-tight">
                  {item.title}
                </h3>

                {item.client && (
                  <p className="text-white/50 text-sm">
                    Client&ensp;{item.client}
                  </p>
                )}

                {creditTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {creditTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-sm text-xs bg-white/[0.06] text-white/60 border border-white/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: CTA */}
              <button
                onClick={handleInquiry}
                className="shrink-0 flex items-center gap-2 px-5 py-3 bg-brand text-white text-sm font-semibold rounded-sm hover:bg-orange-600 transition-colors"
              >
                이 영상을 레퍼런스로 문의하기
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
