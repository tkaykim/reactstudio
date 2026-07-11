import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { extractYouTubeVideoId, youtubeThumbnailUrl, youtubeWatchUrl } from '@/lib/youtube';
import type { ReviewAuthorRole } from '@/lib/review-rooms';

const allowedRoles: ReviewAuthorRole[] = [
  'internal',
  'client',
  'channel_owner',
  'editor',
  'director',
  'viewer',
];

function cleanText(value: unknown, max = 300) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

// 공유 페이지에서 YouTube URL로 새 버전(수정본)을 스택에 추가한다.
export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const authorName = cleanText(body.author_name, 80);
  if (!authorName) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  const role = allowedRoles.includes(body.author_role as ReviewAuthorRole)
    ? (body.author_role as ReviewAuthorRole)
    : 'editor';

  const youtubeUrl = cleanText(body.youtube_url, 500);
  const youtubeVideoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null;
  if (!youtubeVideoId) {
    return NextResponse.json({ error: '올바른 YouTube URL을 입력해주세요.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from('react_review_rooms')
    .select('id,title')
    .eq('share_token', token)
    .eq('bu_code', 'REACT')
    .neq('status', 'archived')
    .maybeSingle();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  if (!room) return NextResponse.json({ error: '리뷰룸을 찾을 수 없습니다.' }, { status: 404 });

  const { count } = await supabase
    .from('react_review_videos')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id);
  const versionLabel = `V${(count ?? 0) + 1}`;

  const { error: clearError } = await supabase
    .from('react_review_videos')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('room_id', room.id)
    .eq('is_current', true);
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });

  const { data: video, error } = await supabase
    .from('react_review_videos')
    .insert({
      room_id: room.id,
      version_label: versionLabel,
      title: cleanText(body.title, 160) ?? `${room.title} ${versionLabel}`,
      youtube_video_id: youtubeVideoId,
      youtube_url: youtubeWatchUrl(youtubeVideoId),
      thumbnail_url: youtubeThumbnailUrl(youtubeVideoId),
      upload_status: 'ready',
      is_current: true,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_rooms').update({ status: 'open' }).eq('id', room.id);
  await supabase.from('react_review_events').insert({
    room_id: room.id,
    video_id: video.id,
    event_type: 'version_added',
    actor_name: authorName,
    actor_role: role,
    payload: { version_label: versionLabel, youtube_video_id: youtubeVideoId },
  });

  return NextResponse.json({ video });
}
