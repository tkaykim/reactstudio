import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://reactstudio.kr';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'REACT Studio | 영상 제작 프로덕션',
    template: '%s | REACT Studio',
  },
  description:
    'REACT Studio는 뮤직비디오, 댄스 필름, 공연 영상, 예능형 웹 콘텐츠, 브랜드 영상을 기획부터 촬영, 편집, 모션그래픽까지 제작하는 영상 프로덕션입니다.',
  keywords: [
    '영상 제작',
    '뮤직비디오 제작',
    '댄스 영상 촬영',
    '공연 영상',
    '예능 콘텐츠',
    '모션그래픽',
    'REACT Studio',
    '리액트 스튜디오',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: 'REACT Studio',
    title: 'REACT Studio | 영상 제작 프로덕션',
    description:
      '기획, 촬영, 편집, 모션그래픽까지 연결해 뮤직비디오와 퍼포먼스 영상을 만드는 프로덕션입니다.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'REACT Studio 영상 제작 프로덕션',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'REACT Studio | 영상 제작 프로덕션',
    description:
      '뮤직비디오, 댄스 필름, 공연 영상, 웹 콘텐츠를 제작하는 REACT Studio입니다.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      'naver-site-verification': '15c1a86fd2e3f74f9da75ba1a09d608b80b84d60',
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoProductionCompany',
  name: 'REACT Studio',
  alternateName: ['React Studio', '리액트 스튜디오'],
  url: siteUrl,
  logo: `${siteUrl}/brand/react-logo-black.png`,
  email: 'react.studio.kr@gmail.com',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'KR',
  },
  description:
    'REACT Studio는 뮤직비디오, 댄스 필름, 공연 영상, 예능형 웹 콘텐츠, 브랜드 영상을 제작하는 영상 프로덕션입니다.',
  knowsAbout: [
    '뮤직비디오 제작',
    '댄스 영상 촬영',
    '공연 영상 제작',
    '웹 콘텐츠 제작',
    '모션그래픽',
    '생성형 AI 영상 제작',
  ],
  makesOffer: [
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: '뮤직비디오 제작',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: '댄스 필름 및 퍼포먼스 영상 촬영',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: '웹 콘텐츠 및 브랜드 영상 제작',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
