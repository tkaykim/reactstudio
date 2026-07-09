import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { extractYouTubeVideoId, youtubeThumbnailUrl, youtubeWatchUrl } from '@/lib/youtube';

function cleanText(value: unknown, max = 1000) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function makeShareToken() {
  return randomBytes(18).toString('base64url');
}

export async function POST(req: NextRequest) {
  const guard = await apiRequireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const title = cleanText(body.title, 160);
  if (!title) {
    return NextResponse.json({ error: '리뷰룸 제목을 입력해주세요.' }, { status: 400 });
  }

  const youtubeUrl = cleanText(body.youtube_url, 500);
  const youtubeVideoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null;
  if (youtubeUrl && !youtubeVideoId) {
    return NextResponse.json({ error: 'YouTube URL을 확인해주세요.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from('react_review_rooms')
    .insert({
      bu_code: ADMIN_BU,
      project_id: cleanNumber(body.project_id),
      title,
      client_name: cleanText(body.client_name, 120),
      description: cleanText(body.description, 2000),
      share_token: makeShareToken(),
      status: youtubeVideoId ? 'open' : 'draft',
      created_by: user.id,
    })
    .select('*')
    .single();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

  let video = null;
  if (youtubeVideoId) {
    const { data, error } = await supabase
      .from('react_review_videos')
      .insert({
        room_id: room.id,
        title: cleanText(body.video_title, 160) ?? title,
        description: cleanText(body.video_description, 2000),
        youtube_video_id: youtubeVideoId,
        youtube_url: youtubeWatchUrl(youtubeVideoId),
        thumbnail_url: youtubeThumbnailUrl(youtubeVideoId),
        upload_status: 'ready',
        is_current: true,
        created_by: user.id,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    video = data;
  }

  await supabase.from('react_review_events').insert({
    room_id: room.id,
    video_id: video?.id ?? null,
    event_type: youtubeVideoId ? 'room_created_with_youtube' : 'room_created',
    actor_name: user.name,
    actor_role: 'internal',
    payload: { source: 'admin' },
  });

  return NextResponse.json({ room, video });
}
