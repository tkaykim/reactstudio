import { NextRequest, NextResponse } from 'next/server';

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);

    if (!res.ok) {
      return NextResponse.json({ error: 'YouTube 영상을 찾을 수 없습니다.' }, { status: 404 });
    }

    const data = await res.json();

    const thumbnailUrl =
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    return NextResponse.json({
      videoId,
      title: data.title,
      thumbnailUrl,
      authorName: data.author_name,
    });
  } catch {
    return NextResponse.json({ error: '영상 정보를 가져올 수 없습니다.' }, { status: 500 });
  }
}
