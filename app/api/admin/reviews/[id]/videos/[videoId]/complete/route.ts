import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { youtubeThumbnailUrl, youtubeWatchUrl } from '@/lib/youtube';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; videoId: string }> }
) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const { id: idParam, videoId: videoRowIdParam } = await context.params;
  const roomId = Number(idParam);
  const videoRowId = Number(videoRowIdParam);
  if (!Number.isFinite(roomId) || !Number.isFinite(videoRowId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const youtubeResponse = (body.youtube_response ?? body.youtubeResponse ?? {}) as Record<string, unknown>;
  const uploadedId = typeof body.youtube_video_id === 'string'
    ? body.youtube_video_id
    : typeof youtubeResponse.id === 'string'
      ? youtubeResponse.id
      : null;

  if (!uploadedId) {
    return NextResponse.json({ error: 'YouTube video id를 찾지 못했습니다.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: room } = await supabase
    .from('react_review_rooms')
    .select('id')
    .eq('id', roomId)
    .eq('bu_code', ADMIN_BU)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: '리뷰룸을 찾을 수 없습니다.' }, { status: 404 });

  const { data: video, error } = await supabase
    .from('react_review_videos')
    .update({
      youtube_video_id: uploadedId,
      youtube_url: youtubeWatchUrl(uploadedId),
      thumbnail_url: youtubeThumbnailUrl(uploadedId),
      upload_status: 'processing',
      youtube_response: youtubeResponse,
    })
    .eq('id', videoRowId)
    .eq('room_id', roomId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_rooms').update({ status: 'open' }).eq('id', roomId);
  await supabase.from('react_review_events').insert({
    room_id: roomId,
    video_id: video.id,
    event_type: 'youtube_upload_completed',
    actor_name: user.name,
    actor_role: 'internal',
    payload: { youtube_video_id: uploadedId },
  });

  return NextResponse.json({ video });
}
