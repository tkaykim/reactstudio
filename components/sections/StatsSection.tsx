'use client';

import { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';

export interface StatsData {
  completedProjects: number;
  yearsOfExperience: number;
  collaborators: number;
}

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref} className="text-4xl sm:text-5xl font-black text-brand">
      {count}
      {suffix}
    </span>
  );
}

export default function StatsSection({ data }: { data?: StatsData }) {
  const stats = [
    { value: data?.completedProjects ?? 200, suffix: '+', label: '제작 완료 프로젝트' },
    { value: data?.yearsOfExperience ?? 5, suffix: '년', label: '전문 제작 경력' },
    { value: data?.collaborators ?? 150, suffix: '+', label: '협업 아티스트' },
    { value: 100, suffix: '%', label: '납기 준수율' },
  ];

  return (
    <section className="py-16 bg-[#050505] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <CountUp target={stat.value} suffix={stat.suffix} />
              <p className="text-white/40 text-sm mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
