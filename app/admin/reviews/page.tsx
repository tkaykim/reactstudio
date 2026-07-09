import { requireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import ReviewsClient, { type ReviewListRoom, type ReviewProjectOption } from './ReviewsClient';

export const dynamic = 'force-dynamic';

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function ReviewsPage() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  const [{ data: roomData, error: roomError }, { data: projectData }] = await Promise.all([
    supabase
      .from('react_review_rooms')
      .select('*')
      .eq('bu_code', ADMIN_BU)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id,name,status')
      .eq('bu_code', ADMIN_BU)
      .order('end_date', { ascending: false, nullsFirst: false }),
  ]);

  if (roomError) console.error('[admin/reviews] rooms', roomError);

  const rooms = (roomData ?? []) as Array<Record<string, unknown>>;
  const roomIds = rooms.map((room) => n(room.id));
  const projectIds = rooms
    .map((room) => (room.project_id ? n(room.project_id) : null))
    .filter((id): id is number => typeof id === 'number' && id > 0);

  const [videosRes, annotationsRes, roomProjectsRes] = roomIds.length
    ? await Promise.all([
        supabase.from('react_review_videos').select('*').in('room_id', roomIds),
        supabase.from('react_review_annotations').select('id,room_id,status').in('room_id', roomIds),
        projectIds.length
          ? supabase.from('projects').select('id,name').in('id', projectIds)
          : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const videosByRoom = new Map<number, Array<Record<string, unknown>>>();
  for (const video of (videosRes.data ?? []) as Array<Record<string, unknown>>) {
    const roomId = n(video.room_id);
    videosByRoom.set(roomId, [...(videosByRoom.get(roomId) ?? []), video]);
  }

  const annotationStats = new Map<number, { total: number; open: number; resolved: number }>();
  for (const annotation of (annotationsRes.data ?? []) as Array<Record<string, unknown>>) {
    const roomId = n(annotation.room_id);
    const current = annotationStats.get(roomId) ?? { total: 0, open: 0, resolved: 0 };
    current.total += 1;
    if (annotation.status === 'open' || annotation.status === 'in_progress') current.open += 1;
    if (annotation.status === 'resolved' || annotation.status === 'approved') current.resolved += 1;
    annotationStats.set(roomId, current);
  }

  const projectNameById = new Map<number, string>();
  for (const project of (roomProjectsRes.data ?? []) as Array<{ id: number; name: string }>) {
    projectNameById.set(project.id, project.name);
  }

  const listRooms: ReviewListRoom[] = rooms.map((room) => {
    const id = n(room.id);
    const videos = videosByRoom.get(id) ?? [];
    const currentVideo = videos.find((video) => video.is_current) ?? videos[0] ?? null;
    const stats = annotationStats.get(id) ?? { total: 0, open: 0, resolved: 0 };
    return {
      id,
      title: String(room.title ?? ''),
      client_name: typeof room.client_name === 'string' ? room.client_name : null,
      project_id: room.project_id ? n(room.project_id) : null,
      project_name: room.project_id ? projectNameById.get(n(room.project_id)) ?? null : null,
      share_token: String(room.share_token ?? ''),
      status: String(room.status ?? 'draft') as ReviewListRoom['status'],
      created_at: String(room.created_at ?? ''),
      video_title: typeof currentVideo?.title === 'string' ? currentVideo.title : null,
      youtube_video_id:
        typeof currentVideo?.youtube_video_id === 'string' ? currentVideo.youtube_video_id : null,
      thumbnail_url: typeof currentVideo?.thumbnail_url === 'string' ? currentVideo.thumbnail_url : null,
      upload_status: String(currentVideo?.upload_status ?? 'queued') as ReviewListRoom['upload_status'],
      annotation_total: stats.total,
      annotation_open: stats.open,
      annotation_resolved: stats.resolved,
    };
  });

  const projects: ReviewProjectOption[] = ((projectData ?? []) as Array<{ id: number; name: string; status: string }>)
    .map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
    }));

  return (
    <ReviewsClient
      initialRooms={listRooms}
      projects={projects}
      siteOrigin={process.env.NEXT_PUBLIC_SITE_URL ?? ''}
    />
  );
}
