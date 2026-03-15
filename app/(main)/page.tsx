import { Suspense } from 'react';
import HeroSection from '@/components/sections/HeroSection';
import ServicesSection from '@/components/sections/ServicesSection';
import FeaturedWork from '@/components/sections/FeaturedWork';
import CtaSection from '@/components/sections/CtaSection';

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Suspense>
        <FeaturedWork />
      </Suspense>
      <ServicesSection />
      <CtaSection />
    </>
  );
}
