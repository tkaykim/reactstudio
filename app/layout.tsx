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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://reactstudio.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'React Studio(리액트 스튜디오) | 뮤직비디오·댄스비디오·퍼포먼스·웹예능 영상 제작',
    template: '%s | React Studio(리액트 스튜디오)',
  },
  description:
    '리액트 스튜디오(React Studio) — 뮤직비디오, 댄스비디오, 퍼포먼스 영상, 라이브 클립, 웹예능 콘텐츠 전문 프로덕션. 예산에 맞춘 유연한 제작, 기획부터 납품까지 원스톱.',
  keywords: [
    '뮤직비디오 제작',
    '댄스비디오 촬영',
    '퍼포먼스 영상',
    '라이브 클립',
    '웹예능 제작',
    '영상 프로덕션',
    '영상제작 업체',
    '뮤직비디오 촬영',
    'K-pop 뮤직비디오',
    '댄스 필름',
    '안무 영상',
    '영상 견적',
    '커머스 영상',
    '광고 영상 제작',
    '리액트 스튜디오',
    'React Studio',
    '리액트스튜디오',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: 'React Studio(리액트 스튜디오)',
    title: 'React Studio(리액트 스튜디오) | 뮤직비디오·댄스비디오·퍼포먼스·웹예능 영상 제작',
    description:
      '리액트 스튜디오(React Studio) — 뮤직비디오, 댄스비디오, 퍼포먼스 영상, 라이브 클립, 웹예능 콘텐츠 전문 프로덕션. 예산에 맞춘 유연한 제작.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'React Studio(리액트 스튜디오) — 영상 프로덕션',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'React Studio(리액트 스튜디오) | 뮤직비디오·댄스비디오·퍼포먼스·웹예능 영상 제작',
    description:
      '리액트 스튜디오(React Studio) — 뮤직비디오, 댄스비디오, 퍼포먼스 영상, 라이브 클립, 웹예능 콘텐츠 전문 프로덕션.',
    images: ['/og-image.png'],
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
  name: 'React Studio(리액트 스튜디오)',
  alternateName: '리액트 스튜디오',
  url: siteUrl,
  logo: `${siteUrl}/logo.svg`,
  description:
    '리액트 스튜디오(React Studio) — 뮤직비디오, 댄스비디오, 퍼포먼스 영상, 라이브 클립, 웹예능 콘텐츠 전문 프로덕션. 예산에 맞춘 유연한 제작, 기획부터 납품까지 원스톱.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'KR',
  },
  sameAs: [],
  knowsAbout: [
    '뮤직비디오 제작',
    '댄스비디오 촬영',
    '퍼포먼스 영상',
    '라이브 클립',
    '웹예능 콘텐츠',
    '광고 영상',
    '커머스 영상',
  ],
  makesOffer: [
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: '뮤직비디오 제작',
        description: '아티스트의 음악을 시각적 언어로 재해석하는 뮤직비디오 제작 서비스',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: '댄스비디오/퍼포먼스 촬영',
        description: '멀티캠 셋업으로 역동적인 안무와 퍼포먼스를 포착하는 영상 제작',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: '웹예능 콘텐츠 제작',
        description: '유튜브, 틱톡 등 플랫폼에 최적화된 숏폼·롱폼 웹 예능 콘텐츠 기획·제작',
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
