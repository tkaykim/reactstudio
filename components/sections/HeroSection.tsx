'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

const words = ['Music Videos', 'Dance Films', 'Live Clips', 'Web Content'];

export default function HeroSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/[0.07] rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-white/40 text-sm tracking-[0.3em] uppercase mb-8"
        >
          Visual Production Studio
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.95] tracking-tight mb-6"
        >
          We create
          <br />
          <span className="inline-block h-[1.1em] overflow-hidden align-bottom">
            <AnimatePresence mode="wait">
              <motion.span
                key={index}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="block text-brand"
              >
                {words[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-white/35 text-base sm:text-lg max-w-lg mx-auto mb-14 leading-relaxed"
        >
          기획부터 납품까지, 한 팀이 완성하는 프리미엄 영상 콘텐츠
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex gap-6 justify-center"
        >
          <Link
            href="/portfolio"
            className="px-8 py-3.5 bg-white text-black text-sm font-semibold tracking-wide uppercase hover:bg-brand hover:text-white transition-all duration-300"
          >
            View Works
          </Link>
          <Link
            href="/contact"
            className="px-8 py-3.5 border border-white/20 text-white/70 text-sm font-semibold tracking-wide uppercase hover:border-brand hover:text-brand transition-all duration-300"
          >
            Contact
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <ArrowDown size={16} className="text-white/20 animate-bounce" />
      </motion.div>
    </section>
  );
}
