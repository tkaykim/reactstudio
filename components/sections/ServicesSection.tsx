'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const services = [
  {
    num: '01',
    title: 'Music Video',
    desc: '아티스트의 음악을 시각적 스토리로 완성합니다.',
  },
  {
    num: '02',
    title: 'Dance / Performance',
    desc: '댄서의 무브먼트를 가장 역동적으로 포착합니다.',
  },
  {
    num: '03',
    title: 'Live Clip',
    desc: '라이브의 에너지를 그대로 스크린으로 옮깁니다.',
  },
  {
    num: '04',
    title: 'Web Content',
    desc: '시청자를 사로잡는 웹 예능·콘텐츠를 제작합니다.',
  },
];

export default function ServicesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-28 bg-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            What We Do
          </h2>
          <p className="text-white/30 text-sm mt-3">
            전문 영역
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-black p-8 group hover:bg-white/[0.02] transition-colors duration-300"
            >
              <span className="text-brand/40 text-xs font-mono tracking-widest">
                {service.num}
              </span>
              <h3 className="text-white font-bold text-lg mt-4 mb-3 group-hover:text-brand transition-colors">
                {service.title}
              </h3>
              <p className="text-white/35 text-sm leading-relaxed">
                {service.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
