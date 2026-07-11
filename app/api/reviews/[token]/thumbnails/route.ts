import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import type { ReviewAuthorRole } from '@/lib/review-rooms';

const allowedRoles: ReviewAuthorRole[] = [
  'internal',
  'client',
  'channel_owner',
  'editor',
  'director',
  'viewer',
];

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extFor(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: '업로드 데이터를 읽을 수 없습니다.' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '이미지 파일을 선택해주세요.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'JPG·PNG·WEBP·GIF 이미지만 업로드할 수 있습니다.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '이미지는 8MB 이하로 업로드해주세요.' }, { status: 400 });
  }

  const authorName = String(form.get('author_name') ?? '').trim().slice(0, 80);
  if (!authorName) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  const roleRaw = String(form.get('author_role') ?? '');
  const role = allowedRoles.includes(roleRaw as ReviewAuthorRole)
    ? (roleRaw as ReviewAuthorRole)
    : 'client';
  const labelInput = String(form.get('label') ?? '').trim().slice(0, 80);

  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from('react_review_rooms')
    .select('id,status')
    .eq('share_token', token)
    .eq('bu_code', 'REACT')
    .neq('status', 'archived')
    .maybeSingle();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  if (!room) return NextResponse.json({ error: '리뷰룸을 찾을 수 없습니다.' }, { status: 404 });

  const { count } = await supabase
    .from('react_review_thumbnails')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id);
  const label = labelInput || `시안 ${(count ?? 0) + 1}`;

  const path = `rooms/${room.id}/thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from('react-review-assets')
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from('react-review-assets').getPublicUrl(path);

  const { data, error } = await supabase
    .from('react_review_thumbnails')
    .insert({
      room_id: room.id,
      label,
      image_url: publicUrl.publicUrl,
      storage_path: path,
      size_bytes: file.size,
      author_name: authorName,
      author_role: role,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('react_review_events').insert({
    room_id: room.id,
    event_type: 'thumbnail_uploaded',
    actor_name: authorName,
    actor_role: role,
    payload: { thumbnail_id: data.id, label },
  });

  return NextResponse.json({ thumbnail: data });
}
