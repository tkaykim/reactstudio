export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  playlistId: string;
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;
const API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function fetchPlaylistVideos(
  playlistId: string,
  maxResults = 50
): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: String(Math.min(maxResults, 50)),
      key: YOUTUBE_API_KEY,
      ...(pageToken ? { pageToken } : {}),
    });

    const res = await fetch(`${API_BASE}/playlistItems?${params}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`YouTube API error: ${res.status}`, await res.text());
      break;
    }

    const data = await res.json();

    for (const item of data.items ?? []) {
      const snippet = item.snippet;
      if (snippet.resourceId?.videoId) {
        videos.push({
          videoId: snippet.resourceId.videoId,
          title: snippet.title,
          thumbnailUrl:
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            '',
          publishedAt: snippet.publishedAt,
          playlistId,
        });
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken && videos.length < maxResults);

  return videos;
}

export async function fetchMultiplePlaylistVideos(
  playlistIds: string[]
): Promise<YouTubeVideo[]> {
  const results = await Promise.all(
    playlistIds.map((id) => fetchPlaylistVideos(id))
  );
  return results.flat();
}
