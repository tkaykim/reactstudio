'use client';

import { Suspense, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import ContactForm from './ContactForm';

export default function CtaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-24 sm:py-32 bg-black border-t border-white/5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
              Let&apos;s Work
              <br />
              <span className="text-brand">Together</span>
            </h2>
            <p className="text-white/30 text-sm max-w-md mx-auto">
              프로젝트에 대해 이야기해주세요. 무료 상담을 통해 맞춤 견적을 제공합니다.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-10">
            <Suspense>
              <ContactForm />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
