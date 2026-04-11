'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useAnimationFrame } from 'framer-motion';
import type { Client } from '@/types';

const LOGO_WIDTH = 180;
const LOGO_GAP = 48;
const SPEED = 0.5;

export default function ClientsMarqueeClient({ clients }: { clients: Client[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const trackWidth = clients.length * (LOGO_WIDTH + LOGO_GAP);

  const wrap = useCallback(
    (v: number) => {
      if (trackWidth === 0) return 0;
      return ((v % trackWidth) + trackWidth) % trackWidth;
    },
    [trackWidth]
  );

  useAnimationFrame(() => {
    if (isPaused || isDragging || trackWidth === 0) return;
    x.set(x.get() - SPEED);
  });

  const [displayCount, setDisplayCount] = useState(3);

  useEffect(() => {
    function calc() {
      const w = window.innerWidth;
      const needed = Math.ceil(w / (LOGO_WIDTH + LOGO_GAP)) + 2;
      const reps = Math.max(3, Math.ceil(needed / clients.length));
      setDisplayCount(reps);
    }
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [clients.length]);

  const repeated = Array.from({ length: displayCount }, () => clients).flat();

  return (
    <section className="py-20 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Work With
        </h2>
        <p className="text-white/30 text-sm mt-3">
          함께 작업한 클라이언트
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div
          className="flex items-center"
          style={{
            x,
            gap: LOGO_GAP,
            width: 'max-content',
          }}
          drag="x"
          dragConstraints={{ left: -trackWidth * (displayCount - 1), right: 0 }}
          dragElastic={0.1}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => {
            setIsDragging(false);
            x.set(-wrap(-x.get()));
          }}
        >
          {repeated.map((client, i) => (
            <div
              key={`${client.id}-${i}`}
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: LOGO_WIDTH, height: 80 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={client.logo_url}
                alt={client.name}
                className="max-w-full max-h-full object-contain opacity-40 hover:opacity-100 transition-opacity duration-300 select-none pointer-events-none"
                draggable={false}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
