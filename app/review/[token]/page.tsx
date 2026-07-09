import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadReviewRoomByToken } from '@/lib/review-room-data';
import ReviewRoomWorkspace from '@/components/reviews/ReviewRoomWorkspace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'REACT 영상 리뷰',
  description: 'REACT Studio 영상 리뷰룸입니다.',
  robots: { index: false, follow: false },
};

export default async function PublicReviewRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const room = await loadReviewRoomByToken(token);
  if (!room) notFound();

  return (
    <ReviewRoomWorkspace
      room={room}
      mode="public"
      defaultAuthorName=""
      defaultAuthorRole="client"
      siteOrigin={process.env.NEXT_PUBLIC_SITE_URL ?? ''}
    />
  );
}
