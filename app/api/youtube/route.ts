import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { fetchPlaylistVideos } from '@/lib/youtube';
import { CURRENT_BU_CODE } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { playlistId, category } = await req.json();

    if (!playlistId) return NextResponse.json({ error: 'playlistId required' }, { status: 400 });

    const videos = await fetchPlaylistVideos(playlistId);
    const supabase = createSupabaseAdminClient();

    let added = 0;
    let updated = 0;

    for (const video of videos) {
      const { data: existing } = await supabase
        .from('portfolio_items')
        .select('id')
        .eq('bu_code', CURRENT_BU_CODE)
        .eq('youtube_video_id', video.videoId)
        .single();

      if (existing) {
        await supabase
          .from('portfolio_items')
          .update({
            title: video.title,
            thumbnail_url: video.thumbnailUrl,
            ...(category ? { category } : {}),
          })
          .eq('id', existing.id);
        updated++;
      } else {
        await supabase.from('portfolio_items').insert({
          bu_code: CURRENT_BU_CODE,
          youtube_video_id: video.videoId,
          youtube_playlist_id: playlistId,
          title: video.title,
          thumbnail_url: video.thumbnailUrl,
          category: category || '뮤직비디오',
          published_at: video.publishedAt,
          is_visible: true,
          display_order: 0,
        });
        added++;
      }
    }

    return NextResponse.json({ success: true, added, updated, total: videos.length });
  } catch (e) {
    console.error('YouTube sync error:', e);
    return NextResponse.json({ error: '동기화에 실패했습니다.' }, { status: 500 });
  }
}
