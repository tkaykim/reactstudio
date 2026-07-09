import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { loadReviewRoomById } from '@/lib/review-room-data';
import ReviewRoomWorkspace from '@/components/reviews/ReviewRoomWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminReviewRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const room = await loadReviewRoomById(id);
  if (!room) notFound();

  return (
    <ReviewRoomWorkspace
      room={room}
      mode="admin"
      defaultAuthorName={user.name}
      defaultAuthorRole="internal"
      siteOrigin={process.env.NEXT_PUBLIC_SITE_URL ?? ''}
    />
  );
}
