import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeroSection from '@/components/sections/HeroSection';
import ServicesSection from '@/components/sections/ServicesSection';
import FeaturedWork from '@/components/sections/FeaturedWork';
import ClientsMarquee from '@/components/sections/ClientsMarquee';
import CtaSection from '@/components/sections/CtaSection';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Suspense>
        <FeaturedWork />
      </Suspense>
      <ServicesSection />
      <Suspense>
        <ClientsMarquee />
      </Suspense>
      <CtaSection />
    </>
  );
}
