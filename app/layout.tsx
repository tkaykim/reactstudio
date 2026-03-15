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

export const metadata: Metadata = {
  title: {
    default: 'React Studio | 뮤직비디오·댄스비디오·퍼포먼스·라이브 클립 제작',
    template: '%s | React Studio',
  },
  description:
    'React Studio는 뮤직비디오, 댄스비디오/퍼포먼스, 라이브 클립, 웹예능, 광고·커머스 영상을 제작하는 전문 프로덕션입니다.',
  keywords: ['뮤직비디오', '댄스비디오', '퍼포먼스', '라이브 클립', '웹예능', '광고', '영상제작', '프로덕션'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://reactstudio.vercel.app',
    siteName: 'React Studio',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
