export function extractYouTubeVideoId(input: string): string | null {
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

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

type YouTubeTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type CreateYouTubeUploadSessionInput = {
  title: string;
  description?: string | null;
  mimeType: string;
  sizeBytes?: number | null;
  privacyStatus?: 'private' | 'unlisted';
};

function getYouTubeEnv() {
  const clientId = process.env.YOUTUBE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken =
    process.env.YOUTUBE_REFRESH_TOKEN_REACTSTUDIO ??
    process.env.YOUTUBE_REFRESH_TOKEN ??
    process.env.GOOGLE_YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'YouTube 업로드 env가 없습니다. YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN_REACTSTUDIO를 설정하세요.'
    );
  }

  return { clientId, clientSecret, refreshToken };
}

export async function getYouTubeAccessToken() {
  const env = getYouTubeEnv();
  const params = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: env.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = (await res.json().catch(() => ({}))) as YouTubeTokenResponse;

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'YouTube access token 발급에 실패했습니다.');
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

export async function createYouTubeResumableUploadSession(input: CreateYouTubeUploadSessionInput) {
  const { accessToken, expiresIn } = await getYouTubeAccessToken();
  const title = input.title.trim().slice(0, 100);
  const description = (input.description ?? '').trim().slice(0, 5000);
  const privacyStatus = input.privacyStatus ?? 'unlisted';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': input.mimeType,
  };
  if (input.sizeBytes && Number.isFinite(input.sizeBytes)) {
    headers['X-Upload-Content-Length'] = String(input.sizeBytes);
  }

  const res = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        snippet: {
          title,
          description,
          categoryId: '24',
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  const uploadUrl = res.headers.get('location');
  if (!res.ok || !uploadUrl) {
    const errorText = await res.text().catch(() => '');
    throw new Error(errorText || 'YouTube 업로드 세션 생성에 실패했습니다.');
  }

  return {
    uploadUrl,
    accessToken,
    expiresIn,
  };
}
