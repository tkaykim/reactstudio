import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { apiRequireAdmin, ADMIN_BU } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { createYouTubeResumableUploadSession } from '@/lib/youtube';

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
  const fileName = cleanText(body.file_name, 300);
  const mimeType = cleanText(body.mime_type, 100);
  const sizeBytes = cleanNumber(body.size_bytes);

  if (!title) return NextResponse.json({ error: '리뷰룸 제목을 입력해주세요.' }, { status: 400 });
  if (!fileName || !mimeType || !mimeType.startsWith('video/')) {
    return NextResponse.json({ error: '업로드할 영상 파일을 확인해주세요.' }, { status: 400 });
  }

  let session;
  try {
    session = await createYouTubeResumableUploadSession({
      title: cleanText(body.video_title, 160) ?? title,
      description: cleanText(body.video_description, 5000) ?? cleanText(body.description, 2000),
      mimeType,
      sizeBytes,
      privacyStatus: 'unlisted',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'YouTube 업로드 세션 생성에 실패했습니다.' },
      { status: 500 }
    );
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
      status: 'uploading',
      created_by: user.id,
    })
    .select('*')
    .single();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

  const { data: video, error: videoError } = await supabase
    .from('react_review_videos')
    .insert({
      room_id: room.id,
      title: cleanText(body.video_title, 160) ?? title,
      description: cleanText(body.video_description, 2000),
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      upload_status: 'uploading',
      is_current: true,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (videoError) return NextResponse.json({ error: videoError.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: room.id,
    video_id: video.id,
    event_type: 'youtube_upload_session_created',
    actor_name: user.name,
    actor_role: 'internal',
    payload: {
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    },
  });

  return NextResponse.json({
    room,
    video,
    uploadUrl: session.uploadUrl,
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
  });
}
