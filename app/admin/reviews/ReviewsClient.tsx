'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Film,
  Link2,
  Loader2,
  MessageSquare,
  UploadCloud,
} from 'lucide-react';
import {
  reviewStatusLabel,
  roomSharePath,
  type ReviewRoomStatus,
  type ReviewUploadStatus,
} from '@/lib/review-rooms';

export type ReviewProjectOption = {
  id: number;
  name: string;
  status: string;
};

export type ReviewListRoom = {
  id: number;
  title: string;
  client_name: string | null;
  project_id: number | null;
  project_name: string | null;
  share_token: string;
  status: ReviewRoomStatus;
  created_at: string;
  video_title: string | null;
  youtube_video_id: string | null;
  thumbnail_url: string | null;
  upload_status: ReviewUploadStatus;
  annotation_total: number;
  annotation_open: number;
  annotation_resolved: number;
};

type UploadResult = {
  room: { id: number; share_token: string };
  video: { id: number };
  uploadUrl: string;
  accessToken: string;
};

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function fmtDate(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR');
}

function shareUrl(origin: string, token: string) {
  const path = roomSharePath(token);
  return origin ? `${origin}${path}` : path;
}

function uploadToYouTube({
  file,
  uploadUrl,
  accessToken,
  onProgress,
}: {
  file: File;
  uploadUrl: string;
  accessToken: string;
  onProgress: (pct: number) => void;
}) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
        } catch {
          resolve({});
        }
      } else {
        reject(new Error(xhr.responseText || `YouTube upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('YouTube 업로드 연결에 실패했습니다.'));
    xhr.send(file);
  });
}

export default function ReviewsClient({
  initialRooms,
  projects,
  siteOrigin,
}: {
  initialRooms: ReviewListRoom[];
  projects: ReviewProjectOption[];
  siteOrigin: string;
}) {
  const router = useRouter();
  const [rooms] = useState(initialRooms);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const counts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        acc.total += 1;
        acc.open += room.annotation_open;
        if (room.status === 'approved') acc.approved += 1;
        if (room.status === 'open' || room.status === 'in_review') acc.active += 1;
        return acc;
      },
      { total: 0, active: 0, open: 0, approved: 0 }
    );
  }, [rooms]);

  async function createManualRoom() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          client_name: clientName,
          description,
          project_id: projectId || null,
          youtube_url: youtubeUrl,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '리뷰룸 생성에 실패했습니다.');
      router.push(`/admin/reviews/${result.room.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '리뷰룸 생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function createUploadRoom() {
    if (!file) return;
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      const res = await fetch('/api/admin/reviews/upload-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          client_name: clientName,
          description,
          project_id: projectId || null,
          video_title: title,
          file_name: file.name,
          mime_type: file.type || 'video/mp4',
          size_bytes: file.size,
        }),
      });
      const result = (await res.json().catch(() => ({}))) as UploadResult & { error?: string };
      if (!res.ok) throw new Error(result.error ?? '업로드 세션 생성에 실패했습니다.');

      const youtubeResponse = await uploadToYouTube({
        file,
        uploadUrl: result.uploadUrl,
        accessToken: result.accessToken,
        onProgress: setProgress,
      });

      const complete = await fetch(
        `/api/admin/reviews/${result.room.id}/videos/${result.video.id}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtube_response: youtubeResponse }),
        }
      );
      const completeResult = await complete.json().catch(() => ({}));
      if (!complete.ok) throw new Error(completeResult.error ?? '업로드 완료 처리에 실패했습니다.');

      router.push(`/admin/reviews/${result.room.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function copyShare(token: string) {
    await navigator.clipboard.writeText(shareUrl(siteOrigin, token));
  }

  const canSubmit = title.trim() && !busy && (youtubeUrl.trim() || file);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">REACT Review Room</p>
          <h1 className="mt-1 text-2xl font-black text-white">영상 리뷰룸</h1>
          <p className="mt-1 text-xs text-white/40">
            전체 {counts.total}개 · 진행 {counts.active}개 · 열린 코멘트 {counts.open}개 · 승인 {counts.approved}개
          </p>
        </div>
      </div>

      <section className="rounded-md border border-white/10 bg-white/[0.025] p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr_0.8fr]">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">
              리뷰룸 제목
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 브랜드 캠페인 1차 편집본"
              className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">
              클라이언트 / 채널주
            </span>
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="표시 이름"
              className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">
              프로젝트
            </span>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-brand"
            >
              <option value="">미연결</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="리뷰 기준이나 전달사항"
          className="mt-3 w-full resize-none rounded border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
        />

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-white/15 bg-black/40 p-4 text-center transition hover:border-brand/70">
            <UploadCloud size={28} className="mb-2 text-brand" />
            <span className="text-sm font-bold text-white">{file ? file.name : '영상 파일 선택'}</span>
            <span className="mt-1 text-xs text-white/35">
              선택한 파일은 브라우저에서 YouTube로 직접 업로드됩니다.
            </span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <label className="block rounded-md border border-white/10 bg-black/40 p-4">
            <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">
              <Link2 size={14} />
              이미 업로드된 YouTube URL
            </span>
            <input
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="h-10 w-full rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
            />
            <p className="mt-2 text-xs leading-relaxed text-white/35">
              YouTube 업로드 env가 준비되지 않은 환경에서도 URL 연결은 바로 사용할 수 있습니다.
            </p>
          </label>
        </div>

        {progress > 0 && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {error && <p className="mt-4 rounded border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={!title.trim() || !youtubeUrl.trim() || busy}
            onClick={createManualRoom}
            className="inline-flex h-10 items-center gap-2 rounded border border-white/15 px-4 text-sm font-bold text-white/70 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Link2 size={16} />
            URL로 연결
          </button>
          <button
            type="button"
            disabled={!canSubmit || !file}
            onClick={createUploadRoom}
            className="inline-flex h-10 items-center gap-2 rounded bg-white px-4 text-sm font-black text-black transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            YouTube 미공개 업로드
          </button>
        </div>
      </section>

      <div className="overflow-hidden rounded-md border border-white/10">
        <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40 md:grid">
          <span>Room</span>
          <span>Comments</span>
          <span>Status</span>
          <span>Share</span>
        </div>
        <div className="divide-y divide-white/5">
          {rooms.length === 0 ? (
            <div className="p-12 text-center text-sm text-white/35">아직 리뷰룸이 없습니다.</div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 px-3 py-3 transition hover:bg-white/[0.035] sm:px-4 md:grid-cols-[96px_1fr_auto_auto_auto]"
              >
                <Link href={`/admin/reviews/${room.id}`} className="block">
                  <div className="relative aspect-video overflow-hidden rounded border border-white/10 bg-white/[0.04]">
                    {room.thumbnail_url ? (
                      <Image src={room.thumbnail_url} alt="" fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Film size={20} className="text-white/25" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="min-w-0">
                  <Link href={`/admin/reviews/${room.id}`} className="text-sm font-black text-white hover:text-brand">
                    {room.title}
                  </Link>
                  <p className="mt-1 truncate text-xs text-white/40">
                    {room.client_name ?? '클라이언트 미지정'} · {room.project_name ?? '프로젝트 미연결'} · {fmtDate(room.created_at)}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/30">{room.video_title ?? '영상 대기 중'}</p>
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-2 md:contents">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <MessageSquare size={14} className="text-white/30" />
                  <span>{room.annotation_total}</span>
                  <span className="rounded bg-brand/15 px-1.5 py-0.5 text-brand">{room.annotation_open}</span>
                </div>
                <span
                  className={cls(
                    'inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-bold',
                    room.status === 'approved'
                      ? 'border-white/10 bg-white text-black'
                      : room.status === 'open' || room.status === 'in_review'
                        ? 'border-brand/25 bg-brand/10 text-brand'
                        : 'border-white/10 text-white/45'
                  )}
                >
                  {room.status === 'approved' && <CheckCircle2 size={13} />}
                  {reviewStatusLabel(room.status)}
                </span>
                <div className="ml-auto flex justify-end gap-2 md:ml-0">
                  <button
                    type="button"
                    onClick={() => copyShare(room.share_token)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/55 transition hover:border-brand hover:text-brand"
                    aria-label="공유 링크 복사"
                    title="공유 링크 복사"
                  >
                    <Clipboard size={14} />
                  </button>
                  <a
                    href={shareUrl(siteOrigin, room.share_token)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 text-white/55 transition hover:border-brand hover:text-brand"
                    aria-label="공유 링크 열기"
                    title="공유 링크 열기"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
