'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent } from 'react';
import Link from 'next/link';
/* eslint-disable @next/next/no-img-element */
import {
  CheckCircle2,
  Circle,
  Clock3,
  Clipboard,
  ExternalLink,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  LocateFixed,
  MessageSquare,
  MoveHorizontal,
  PauseCircle,
  Play,
  Send,
  SquareDashedMousePointer,
} from 'lucide-react';
import {
  REVIEW_ANNOTATION_STATUS_OPTIONS,
  REVIEW_AUTHOR_ROLE_OPTIONS,
  annotationStatusLabel,
  authorRoleLabel,
  formatTimecode,
  formatTimeRange,
  roomSharePath,
  type ReviewAnnotationRow,
  type ReviewAnnotationShape,
  type ReviewAnnotationStatus,
  type ReviewAuthorRole,
  type ReviewRoomRow,
  type ReviewThumbnailRow,
} from '@/lib/review-rooms';

type WorkspaceMode = 'admin' | 'public';

type StageTarget = 'video' | number; // number = thumbnail id

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
    });
  }
  return ytApiPromise;
}

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

// 상태는 색상 종류가 아니라 명도 단계로 구분한다: 열림(브랜드 1곳)→진행중(연한 회색)→완료(진한 회색)→승인(흰 배경)
function statusTone(status: ReviewAnnotationStatus) {
  if (status === 'approved') return 'border-white/10 bg-white text-black';
  if (status === 'resolved') return 'border-white/15 bg-white/10 text-white/80';
  if (status === 'in_progress') return 'border-white/10 bg-white/5 text-white/55';
  return 'border-brand/25 bg-brand/10 text-brand';
}

function roleTone(role: ReviewAuthorRole) {
  if (role === 'internal') return 'bg-white text-black';
  return 'bg-white/10 text-white/60';
}

function shapeIcon(shape: ReviewAnnotationShape, isThumbnail: boolean) {
  if (isThumbnail && shape === 'time') return <ImageIcon size={13} />;
  if (shape === 'pin') return <LocateFixed size={13} />;
  if (shape === 'box') return <SquareDashedMousePointer size={13} />;
  if (shape === 'range') return <MoveHorizontal size={13} />;
  return <Clock3 size={13} />;
}

function safePct(value: number | null | undefined, fallback = 0) {
  return Math.min(100, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback));
}

// 저장된 핀/영역 마커가 화면에 보이는 시간 창(초)
const MARKER_WINDOW_SEC = 2;

type DraftPoint = {
  shape: ReviewAnnotationShape;
  x_pct: number | null;
  y_pct: number | null;
  w_pct: number | null;
  h_pct: number | null;
  time_sec: number;
  end_time_sec: number | null;
};

const emptyDraft = (shape: ReviewAnnotationShape, timeSec: number): DraftPoint => ({
  shape,
  x_pct: null,
  y_pct: null,
  w_pct: null,
  h_pct: null,
  time_sec: timeSec,
  end_time_sec: null,
});

export default function ReviewRoomWorkspace({
  room,
  mode,
  defaultAuthorName,
  defaultAuthorRole,
  siteOrigin,
}: {
  room: ReviewRoomRow;
  mode: WorkspaceMode;
  defaultAuthorName: string;
  defaultAuthorRole: ReviewAuthorRole;
  siteOrigin: string;
}) {
  const currentVideo = useMemo(
    () => room.videos.find((video) => video.is_current) ?? room.videos[0] ?? null,
    [room.videos]
  );
  const [annotations, setAnnotations] = useState(room.annotations);
  const [thumbnails, setThumbnails] = useState<ReviewThumbnailRow[]>(room.thumbnails ?? []);
  const [stage, setStage] = useState<StageTarget>('video');
  const [selectedId, setSelectedId] = useState<number | null>(room.annotations[0]?.id ?? null);
  const [placement, setPlacement] = useState<ReviewAnnotationShape>('time');
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorRole, setAuthorRole] = useState<ReviewAuthorRole>(defaultAuthorRole);
  const [body, setBody] = useState('');
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [draftPoint, setDraftPoint] = useState<DraftPoint>(emptyDraft('time', 0));
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const shareUrl = siteOrigin ? `${siteOrigin}${roomSharePath(room.share_token)}` : roomSharePath(room.share_token);

  const stageThumbnail = stage === 'video' ? null : thumbnails.find((t) => t.id === stage) ?? null;
  const onThumbnailStage = stageThumbnail !== null;

  useEffect(() => {
    if (!currentVideo?.youtube_video_id || !playerHostRef.current) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !window.YT?.Player || !playerHostRef.current || !currentVideo.youtube_video_id) return;
      playerHostRef.current.innerHTML = '';
      const player = new window.YT.Player(playerHostRef.current, {
        videoId: currentVideo.youtube_video_id,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            playerRef.current = player;
            setDuration(player.getDuration?.() ?? 0);
            interval = setInterval(() => {
              const next = player.getCurrentTime?.() ?? 0;
              setCurrentTime(next);
              const d = player.getDuration?.() ?? 0;
              if (d) setDuration(d);
            }, 500);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [currentVideo?.youtube_video_id]);

  function playerTime() {
    const time = playerRef.current?.getCurrentTime?.() ?? currentTime;
    return Number.isFinite(time) ? Math.max(0, time) : 0;
  }

  function seekTo(seconds: number, annotationId?: number) {
    playerRef.current?.seekTo?.(seconds, true);
    setCurrentTime(seconds);
    if (annotationId) setSelectedId(annotationId);
  }

  function focusAnnotation(annotation: ReviewAnnotationRow) {
    setSelectedId(annotation.id);
    if (annotation.thumbnail_id) {
      if (thumbnails.some((t) => t.id === annotation.thumbnail_id)) switchStage(annotation.thumbnail_id);
      return;
    }
    if (stage !== 'video') switchStage('video');
    seekTo(annotation.time_sec, annotation.id);
  }

  function switchStage(next: StageTarget) {
    setStage(next);
    setPlacement('time');
    setDragStart(null);
    setDraftPoint(emptyDraft('time', next === 'video' ? playerTime() : 0));
  }

  function switchPlacement(next: ReviewAnnotationShape) {
    setPlacement(next);
    setDragStart(null);
    const base = onThumbnailStage ? 0 : playerTime();
    if (next === 'range') {
      setDraftPoint({ ...emptyDraft('range', base), end_time_sec: null });
    } else {
      setDraftPoint(emptyDraft(next, base));
    }
  }

  function overlayPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: safePct(((event.clientX - rect.left) / rect.width) * 100),
      y: safePct(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  function handleOverlayPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (placement !== 'pin' && placement !== 'box') return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 일부 환경에서 pointer capture가 거부되어도 드래그 자체는 계속 진행한다
    }
    const point = overlayPoint(event);
    if (placement === 'box') {
      setDragStart(point);
      setDraftPoint({
        shape: 'box',
        x_pct: point.x,
        y_pct: point.y,
        w_pct: 0,
        h_pct: 0,
        time_sec: onThumbnailStage ? 0 : playerTime(),
        end_time_sec: null,
      });
    }
  }

  function handleOverlayPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (placement !== 'box' || !dragStart) return;
    const point = overlayPoint(event);
    setDraftPoint((prev) => ({
      ...prev,
      shape: 'box',
      x_pct: (dragStart.x + point.x) / 2,
      y_pct: (dragStart.y + point.y) / 2,
      w_pct: Math.abs(point.x - dragStart.x),
      h_pct: Math.abs(point.y - dragStart.y),
    }));
  }

  function handleOverlayPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const point = overlayPoint(event);
    if (placement === 'pin') {
      setDraftPoint({
        shape: 'pin',
        x_pct: point.x,
        y_pct: point.y,
        w_pct: null,
        h_pct: null,
        time_sec: onThumbnailStage ? 0 : playerTime(),
        end_time_sec: null,
      });
      return;
    }
    if (placement === 'box' && dragStart) {
      const w = Math.abs(point.x - dragStart.x);
      const h = Math.abs(point.y - dragStart.y);
      if (w < 2 || h < 2) {
        // 드래그 없이 탭/클릭한 경우 기본 크기 영역
        setDraftPoint({
          shape: 'box',
          x_pct: point.x,
          y_pct: point.y,
          w_pct: 18,
          h_pct: 12,
          time_sec: onThumbnailStage ? 0 : playerTime(),
          end_time_sec: null,
        });
      }
      setDragStart(null);
    }
  }

  function captureTime() {
    setDraftPoint(emptyDraft('time', playerTime()));
  }

  function captureRangeStart() {
    const now = playerTime();
    setDraftPoint((prev) => ({
      ...emptyDraft('range', now),
      end_time_sec: prev.end_time_sec != null && prev.end_time_sec > now ? prev.end_time_sec : null,
    }));
  }

  function captureRangeEnd() {
    const now = playerTime();
    setDraftPoint((prev) => {
      const start = prev.shape === 'range' ? prev.time_sec : Math.min(prev.time_sec, now);
      if (now <= start) {
        return { ...emptyDraft('range', now), end_time_sec: null };
      }
      return { ...emptyDraft('range', start), end_time_sec: now };
    });
  }

  async function submitAnnotation() {
    if (!body.trim()) return;
    if (placement === 'range' && !onThumbnailStage && (draftPoint.end_time_sec == null || draftPoint.end_time_sec <= draftPoint.time_sec)) {
      setError('구간 코멘트는 시작·종료 지점을 모두 지정해주세요. (영상 재생 위치를 옮긴 뒤 "종료 지점" 버튼)');
      return;
    }
    if ((placement === 'pin' || placement === 'box') && draftPoint.x_pct == null) {
      setError(onThumbnailStage ? '썸네일 위를 탭해서 위치를 먼저 지정해주세요.' : '화면 위를 탭해서 위치를 먼저 지정해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const timeSec =
        onThumbnailStage ? 0 : placement === 'time' ? playerTime() : draftPoint.time_sec;
      const res = await fetch(`/api/reviews/${encodeURIComponent(room.share_token)}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          author_name: authorName,
          author_email: authorEmail,
          author_role: authorRole,
          time_sec: timeSec,
          end_time_sec: placement === 'range' ? draftPoint.end_time_sec : null,
          shape: draftPoint.shape,
          x_pct: draftPoint.x_pct,
          y_pct: draftPoint.y_pct,
          w_pct: draftPoint.w_pct,
          h_pct: draftPoint.h_pct,
          thumbnail_id: onThumbnailStage ? stageThumbnail?.id : null,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '코멘트 저장에 실패했습니다.');
      setAnnotations((prev) => [...prev, result.annotation].sort((a, b) => a.time_sec - b.time_sec));
      setSelectedId(result.annotation.id);
      setBody('');
      setDraftPoint(emptyDraft(placement === 'range' ? 'range' : placement, onThumbnailStage ? 0 : playerTime()));
    } catch (err) {
      setError(err instanceof Error ? err.message : '코멘트 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function submitReply(annotation: ReviewAnnotationRow) {
    const text = replyText[annotation.id]?.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/reviews/${encodeURIComponent(room.share_token)}/annotations/${annotation.id}/replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: text,
            author_name: authorName,
            author_email: authorEmail,
            author_role: authorRole,
          }),
        }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '답글 저장에 실패했습니다.');
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === annotation.id ? { ...item, replies: [...item.replies, result.reply] } : item
        )
      );
      setReplyText((prev) => ({ ...prev, [annotation.id]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '답글 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function patchAnnotation(annotation: ReviewAnnotationRow, patch: Record<string, unknown>) {
    if (mode !== 'admin') return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/reviews/${room.id}/annotations/${annotation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '상태 변경에 실패했습니다.');
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === annotation.id ? { ...item, ...result.annotation, replies: item.replies } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadThumbnail(file: File) {
    if (!authorName.trim()) {
      setError('썸네일 업로드 전에 아래 코멘트 작성란에서 이름을 먼저 입력해주세요.');
      return;
    }
    setUploadBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('author_name', authorName);
      form.append('author_role', authorRole);
      const res = await fetch(`/api/reviews/${encodeURIComponent(room.share_token)}/thumbnails`, {
        method: 'POST',
        body: form,
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '썸네일 업로드에 실패했습니다.');
      setThumbnails((prev) => [...prev, result.thumbnail]);
      switchStage(result.thumbnail.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '썸네일 업로드에 실패했습니다.');
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function selectThumbnail(thumbnail: ReviewThumbnailRow, event?: MouseEvent) {
    event?.stopPropagation();
    if (!authorName.trim()) {
      setError('이 시안을 선택하려면 아래 코멘트 작성란에서 이름을 먼저 입력해주세요.');
      return;
    }
    if (!window.confirm(`'${thumbnail.label}'을(를) 최종 썸네일로 선택할까요?`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/reviews/${encodeURIComponent(room.share_token)}/thumbnails/${thumbnail.id}/select`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_name: authorName, author_role: authorRole }),
        }
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '썸네일 선택에 실패했습니다.');
      setThumbnails((prev) =>
        prev.map((item) =>
          item.id === thumbnail.id
            ? result.thumbnail
            : item.status === 'selected'
              ? { ...item, status: 'proposed' as const, selected_at: null, selected_by: null }
              : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '썸네일 선택에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function copyShare() {
    await navigator.clipboard.writeText(shareUrl);
  }

  const markerDuration =
    duration ||
    Math.max(
      1,
      ...annotations.map((annotation) =>
        Math.max(Number(annotation.time_sec), Number(annotation.end_time_sec ?? 0)) + 10
      )
    );

  const videoAnnotations = useMemo(
    () => annotations.filter((a) => !a.thumbnail_id && a.video_id === currentVideo?.id),
    [annotations, currentVideo?.id]
  );

  // 시간 창(±2초) 안에 있거나, 구간 내부이거나, 선택된 코멘트만 화면 위에 표시
  const visibleVideoMarkers = videoAnnotations.filter((annotation) => {
    if (annotation.x_pct == null || annotation.y_pct == null) return false;
    if (selectedId === annotation.id) return true;
    if (annotation.end_time_sec != null) {
      return currentTime >= annotation.time_sec - 0.5 && currentTime <= annotation.end_time_sec + 0.5;
    }
    return Math.abs(currentTime - annotation.time_sec) <= MARKER_WINDOW_SEC;
  });

  const stageThumbnailMarkers = annotations.filter(
    (a) => onThumbnailStage && a.thumbnail_id === stageThumbnail?.id && a.x_pct != null && a.y_pct != null
  );

  const thumbnailCommentCount = (thumbnailId: number) =>
    annotations.filter((a) => a.thumbnail_id === thumbnailId).length;

  const placementOptions: Array<{ value: ReviewAnnotationShape; label: string; icon: typeof Clock3 }> =
    onThumbnailStage
      ? [
          { value: 'time', label: '일반', icon: MessageSquare },
          { value: 'pin', label: '핀', icon: LocateFixed },
          { value: 'box', label: '영역', icon: SquareDashedMousePointer },
        ]
      : [
          { value: 'time', label: '타임코드', icon: Clock3 },
          { value: 'range', label: '구간', icon: MoveHorizontal },
          { value: 'pin', label: '핀', icon: LocateFixed },
          { value: 'box', label: '영역', icon: SquareDashedMousePointer },
        ];

  function renderMarker(annotation: ReviewAnnotationRow) {
    const active = selectedId === annotation.id;
    const x = safePct(annotation.x_pct);
    const y = safePct(annotation.y_pct);
    const w = safePct(annotation.w_pct, 14);
    const h = safePct(annotation.h_pct, 10);
    return annotation.shape === 'box' ? (
      <button
        key={annotation.id}
        type="button"
        onClick={() => focusAnnotation(annotation)}
        className={cls(
          'pointer-events-auto absolute rounded border-2 transition',
          active ? 'border-brand bg-brand/15' : 'border-white/80 bg-black/10 hover:border-white'
        )}
        style={{
          left: `${Math.max(0, x - w / 2)}%`,
          top: `${Math.max(0, y - h / 2)}%`,
          width: `${w}%`,
          height: `${h}%`,
        }}
        aria-label={`코멘트 ${annotation.id}`}
      />
    ) : (
      <button
        key={annotation.id}
        type="button"
        onClick={() => focusAnnotation(annotation)}
        className={cls(
          'pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-black transition',
          active ? 'border-brand bg-brand text-white' : 'border-white bg-black/75 text-white hover:bg-black'
        )}
        style={{ left: `${x}%`, top: `${y}%` }}
        aria-label={`코멘트 ${annotation.id}`}
      >
        {annotation.id}
      </button>
    );
  }

  function renderDraftMarker() {
    if (draftPoint.x_pct == null || draftPoint.y_pct == null) return null;
    if (draftPoint.shape === 'box') {
      const w = Math.max(0.5, safePct(draftPoint.w_pct, 0));
      const h = Math.max(0.5, safePct(draftPoint.h_pct, 0));
      return (
        <div
          className="pointer-events-none absolute rounded border-2 border-dashed border-brand bg-brand/10"
          style={{
            left: `${Math.max(0, safePct(draftPoint.x_pct) - w / 2)}%`,
            top: `${Math.max(0, safePct(draftPoint.y_pct) - h / 2)}%`,
            width: `${w}%`,
            height: `${h}%`,
          }}
        />
      );
    }
    if (draftPoint.shape === 'pin') {
      return (
        <div
          className="pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-brand bg-brand/20 text-brand"
          style={{ left: `${safePct(draftPoint.x_pct)}%`, top: `${safePct(draftPoint.y_pct)}%` }}
        >
          <LocateFixed size={13} />
        </div>
      );
    }
    return null;
  }

  const captureActive = placement === 'pin' || placement === 'box';

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <main className={cls('mx-auto w-full space-y-4 px-3 py-4 sm:px-4 sm:py-5', mode === 'admin' ? 'max-w-7xl' : 'max-w-6xl')}>
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">REACT Review Room</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">{room.title}</h1>
            <p className="mt-1 text-sm text-white/45">
              {room.client_name ?? '클라이언트 미지정'} · {room.project_name ?? '프로젝트 미연결'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === 'admin' && (
              <Link
                href="/admin/reviews"
                className="inline-flex h-9 items-center rounded border border-white/10 px-3 text-xs font-bold text-white/60 transition hover:border-white/25 hover:text-white"
              >
                목록
              </Link>
            )}
            <button
              type="button"
              onClick={copyShare}
              className="inline-flex h-9 items-center gap-2 rounded border border-white/10 px-3 text-xs font-bold text-white/60 transition hover:border-white/25 hover:text-white"
            >
              <Clipboard size={14} />
              공유 링크
            </button>
            {currentVideo?.youtube_url && (
              <a
                href={currentVideo.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded border border-white/10 px-3 text-xs font-bold text-white/60 transition hover:border-white/25 hover:text-white"
              >
                <ExternalLink size={14} />
                YouTube
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px]">
            <div className="sticky top-0 z-30 -mx-3 space-y-2 bg-[#080808] px-3 pb-2 sm:-mx-4 sm:px-4 xl:static xl:col-start-1 xl:row-start-1 xl:mx-0 xl:space-y-3 xl:bg-transparent xl:p-0">
            {/* 영상 스테이지 (마운트 유지, 썸네일 스테이지일 땐 숨김) */}
            <div className={cls('relative aspect-video overflow-hidden rounded-md border border-white/10 bg-black', onThumbnailStage && 'hidden')}>
              {currentVideo?.youtube_video_id ? (
                <>
                  <div ref={playerHostRef} className="h-full w-full" />
                  <div className="pointer-events-none absolute inset-0">
                    {captureActive && (
                      <div
                        className="pointer-events-auto absolute inset-0 cursor-crosshair touch-none"
                        onPointerDown={handleOverlayPointerDown}
                        onPointerMove={handleOverlayPointerMove}
                        onPointerUp={handleOverlayPointerUp}
                        title="화면 위치 선택"
                      />
                    )}
                    {visibleVideoMarkers.map(renderMarker)}
                    {!onThumbnailStage && renderDraftMarker()}
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <PauseCircle size={42} className="mb-3 text-white/25" />
                  <p className="text-lg font-black">YouTube 처리 중</p>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">
                    영상 업로드가 끝났거나 처리 중이면 잠시 후 새로고침해서 플레이어를 확인할 수 있습니다.
                  </p>
                </div>
              )}
            </div>

            {/* 썸네일 스테이지 */}
            {onThumbnailStage && stageThumbnail && (
              <div className="relative overflow-hidden rounded-md border border-white/10 bg-black">
                <img src={stageThumbnail.image_url} alt={stageThumbnail.label} className="block h-auto w-full" />
                <div className="pointer-events-none absolute inset-0">
                  {captureActive && (
                    <div
                      className="pointer-events-auto absolute inset-0 cursor-crosshair touch-none"
                      onPointerDown={handleOverlayPointerDown}
                      onPointerMove={handleOverlayPointerMove}
                      onPointerUp={handleOverlayPointerUp}
                      title="썸네일 위치 선택"
                    />
                  )}
                  {stageThumbnailMarkers.map(renderMarker)}
                  {renderDraftMarker()}
                </div>
                <div className="absolute left-2 top-2 flex items-center gap-1.5">
                  <span className="rounded bg-black/70 px-2 py-1 text-[11px] font-bold text-white">
                    {stageThumbnail.label}
                  </span>
                  {stageThumbnail.status === 'selected' && (
                    <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-black text-black">
                      <CheckCircle2 size={12} />
                      선택됨
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 타임라인 (영상 스테이지에서만) */}
            {!onThumbnailStage && (
              <div className="rounded-md border border-white/10 bg-white/[0.025] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-white/45">{formatTimecode(currentTime)}</span>
                  <span className="text-xs text-white/30">{formatTimecode(markerDuration)}</span>
                </div>
                <div
                  className="relative h-3 cursor-pointer rounded-full bg-white/10"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const pct = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
                    seekTo(pct * markerDuration);
                  }}
                >
                  <div
                    className="pointer-events-none absolute top-0 h-3 rounded-full bg-white/25"
                    style={{ width: `${Math.min(100, (currentTime / markerDuration) * 100)}%` }}
                  />
                  {/* 구간 코멘트 밴드 */}
                  {videoAnnotations
                    .filter((annotation) => annotation.end_time_sec != null)
                    .map((annotation) => (
                      <button
                        key={`range-${annotation.id}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          focusAnnotation(annotation);
                        }}
                        className={cls(
                          'absolute top-1/2 h-3 -translate-y-1/2 rounded-full transition',
                          selectedId === annotation.id ? 'bg-brand/70' : 'bg-brand/35 hover:bg-brand/60'
                        )}
                        style={{
                          left: `${Math.min(100, (annotation.time_sec / markerDuration) * 100)}%`,
                          width: `${Math.max(1, ((Number(annotation.end_time_sec) - annotation.time_sec) / markerDuration) * 100)}%`,
                        }}
                        aria-label={`${formatTimeRange(annotation.time_sec, annotation.end_time_sec)} 구간 코멘트`}
                      />
                    ))}
                  {/* 지점 코멘트 마커 */}
                  {videoAnnotations
                    .filter((annotation) => annotation.end_time_sec == null)
                    .map((annotation) => (
                      <button
                        key={annotation.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          focusAnnotation(annotation);
                        }}
                        className={cls(
                          'absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition',
                          selectedId === annotation.id ? 'bg-brand' : 'bg-white hover:bg-brand'
                        )}
                        style={{ left: `${Math.min(100, (annotation.time_sec / markerDuration) * 100)}%` }}
                        aria-label={`${formatTimecode(annotation.time_sec)} 코멘트`}
                      />
                    ))}
                  {/* 구간 드래프트 표시 */}
                  {placement === 'range' && draftPoint.end_time_sec != null && (
                    <div
                      className="pointer-events-none absolute top-1/2 h-3 -translate-y-1/2 rounded-full border border-dashed border-brand bg-brand/20"
                      style={{
                        left: `${Math.min(100, (draftPoint.time_sec / markerDuration) * 100)}%`,
                        width: `${Math.max(1, ((draftPoint.end_time_sec - draftPoint.time_sec) / markerDuration) * 100)}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            </div>

            {/* 미디어 레일: 영상 + 썸네일 시안들 */}
            <div className="flex gap-2 overflow-x-auto pb-1 xl:col-start-1 xl:row-start-2">
              <button
                type="button"
                onClick={() => switchStage('video')}
                className={cls(
                  'flex w-24 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-[11px] font-bold transition',
                  !onThumbnailStage
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                )}
              >
                <Play size={16} />
                영상
              </button>
              {thumbnails.map((thumbnail) => (
                <button
                  key={thumbnail.id}
                  type="button"
                  onClick={() => switchStage(thumbnail.id)}
                  className={cls(
                    'relative w-28 flex-shrink-0 overflow-hidden rounded-md border text-left transition',
                    stage === thumbnail.id ? 'border-brand' : 'border-white/10 hover:border-white/35'
                  )}
                >
                  <span className="relative block aspect-video w-full bg-white/[0.04]">
                    <img
                      src={thumbnail.image_url}
                      alt={thumbnail.label}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {thumbnail.status === 'selected' && (
                      <span className="absolute right-1 top-1 rounded bg-white p-0.5 text-black">
                        <CheckCircle2 size={12} />
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-1 px-1.5 py-1">
                    <span className="truncate text-[10px] font-bold text-white/70">{thumbnail.label}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                      <MessageSquare size={10} />
                      {thumbnailCommentCount(thumbnail.id)}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => selectThumbnail(thumbnail, event)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') selectThumbnail(thumbnail);
                    }}
                    className={cls(
                      'block w-full cursor-pointer border-t px-1.5 py-1 text-center text-[10px] font-black transition',
                      thumbnail.status === 'selected'
                        ? 'border-white/10 bg-white/10 text-white'
                        : 'border-white/10 text-white/45 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {thumbnail.status === 'selected' ? `선택됨 · ${thumbnail.selected_by ?? ''}` : '이 시안 선택'}
                  </span>
                </button>
              ))}
              <button
                type="button"
                disabled={uploadBusy}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-24 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/20 px-2 py-2 text-[11px] font-bold text-white/45 transition hover:border-white/40 hover:text-white disabled:opacity-40"
              >
                {uploadBusy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                썸네일 추가
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadThumbnail(file);
                }}
              />
            </div>

            <section className="rounded-md border border-white/10 bg-white/[0.025] p-3 sm:p-4 xl:col-start-1 xl:row-start-3">
              <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_0.8fr]">
                <input
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  placeholder="이름"
                  className="order-1 h-10 min-w-0 rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
                />
                <input
                  value={authorEmail}
                  onChange={(event) => setAuthorEmail(event.target.value)}
                  placeholder="이메일 (선택)"
                  className="order-3 col-span-2 h-10 min-w-0 rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand md:order-2 md:col-span-1"
                />
                <select
                  value={authorRole}
                  onChange={(event) => setAuthorRole(event.target.value as ReviewAuthorRole)}
                  className="order-2 h-10 min-w-0 rounded border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-brand md:order-3"
                >
                  {REVIEW_AUTHOR_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {onThumbnailStage && stageThumbnail && (
                <p className="mb-3 inline-flex items-center gap-1.5 rounded bg-brand/10 px-2 py-1 text-xs font-bold text-brand">
                  <ImageIcon size={13} />
                  {stageThumbnail.label}에 코멘트를 남깁니다
                </p>
              )}

              <div className="mb-3 flex flex-wrap gap-2">
                {placementOptions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => switchPlacement(item.value)}
                      className={cls(
                        'inline-flex h-9 items-center gap-2 rounded border px-3 text-xs font-bold transition',
                        placement === item.value
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-white/10 text-white/55 hover:border-white/30 hover:text-white'
                      )}
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {!onThumbnailStage && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {placement === 'range' ? (
                    <>
                      <button
                        type="button"
                        onClick={captureRangeStart}
                        className="inline-flex h-9 items-center gap-1.5 rounded border border-white/10 px-3 text-xs font-bold text-white/55 transition hover:border-brand hover:text-brand"
                      >
                        시작 지점 = {formatTimecode(draftPoint.time_sec)}
                      </button>
                      <button
                        type="button"
                        onClick={captureRangeEnd}
                        className={cls(
                          'inline-flex h-9 items-center gap-1.5 rounded border px-3 text-xs font-bold transition',
                          draftPoint.end_time_sec == null
                            ? 'border-brand/60 text-brand hover:bg-brand/10'
                            : 'border-white/10 text-white/55 hover:border-brand hover:text-brand'
                        )}
                      >
                        종료 지점 {draftPoint.end_time_sec != null ? `= ${formatTimecode(draftPoint.end_time_sec)}` : '지정'}
                      </button>
                      <span className="inline-flex h-9 items-center rounded border border-white/10 px-3 text-xs text-white/35">
                        {draftPoint.end_time_sec != null
                          ? `구간 ${formatTimeRange(draftPoint.time_sec, draftPoint.end_time_sec)}`
                          : '영상을 종료 지점까지 재생/이동 후 "종료 지점"을 눌러주세요'}
                      </span>
                    </>
                  ) : (
                    <>
                      {placement === 'time' && (
                        <button
                          type="button"
                          onClick={captureTime}
                          className="inline-flex h-9 items-center rounded border border-white/10 px-3 text-xs font-bold text-white/55 transition hover:border-white/25 hover:text-white"
                        >
                          현재 {formatTimecode(playerTime())}
                        </button>
                      )}
                      <span className="inline-flex h-9 items-center rounded border border-white/10 px-3 text-xs text-white/35">
                        {placement === 'time' && `타임코드 ${formatTimecode(draftPoint.time_sec)}`}
                        {(placement === 'pin' || placement === 'box') &&
                          (draftPoint.x_pct != null
                            ? `${formatTimecode(draftPoint.time_sec)} · ${Math.round(draftPoint.x_pct)}%, ${Math.round(draftPoint.y_pct ?? 0)}%`
                            : placement === 'pin'
                              ? '화면 위를 탭해서 핀 위치를 지정하세요'
                              : '화면 위에서 드래그해 영역을 지정하세요')}
                      </span>
                    </>
                  )}
                </div>
              )}

              {onThumbnailStage && (placement === 'pin' || placement === 'box') && (
                <p className="mb-3 text-xs text-white/35">
                  {draftPoint.x_pct != null
                    ? `위치 ${Math.round(draftPoint.x_pct)}%, ${Math.round(draftPoint.y_pct ?? 0)}%`
                    : placement === 'pin'
                      ? '썸네일 위를 탭해서 핀 위치를 지정하세요'
                      : '썸네일 위에서 드래그해 영역을 지정하세요'}
                </p>
              )}

              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
                placeholder="코멘트"
                className="w-full resize-none rounded border border-white/10 bg-black px-3 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-brand"
              />
              {error && <p className="mt-3 rounded border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p>}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={busy || !body.trim() || !authorName.trim()}
                  onClick={submitAnnotation}
                  className="inline-flex h-10 items-center gap-2 rounded bg-white px-4 text-sm font-black text-black transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Send size={16} />
                  저장
                </button>
              </div>
            </section>

          <aside className="space-y-3 xl:col-start-2 xl:row-span-3 xl:row-start-1">
            <div className="rounded-md border border-white/10 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-sm font-black">
                  <MessageSquare size={16} className="text-white/40" />
                  코멘트
                </h2>
                <span className="text-xs text-white/35">{annotations.length}개</span>
              </div>
            </div>

            <div className="space-y-3 xl:max-h-[calc(100vh-150px)] xl:overflow-auto xl:pr-1">
              {annotations.length === 0 ? (
                <div className="rounded-md border border-white/10 p-8 text-center text-sm text-white/35">
                  아직 코멘트가 없습니다.
                </div>
              ) : (
                annotations.map((annotation) => {
                  const active = selectedId === annotation.id;
                  const isThumb = annotation.thumbnail_id != null;
                  const thumbLabel = isThumb
                    ? thumbnails.find((t) => t.id === annotation.thumbnail_id)?.label ?? '썸네일'
                    : null;
                  return (
                    <article
                      key={annotation.id}
                      className={cls(
                        'rounded-md border bg-white/[0.025] p-3 transition',
                        active ? 'border-brand/60' : 'border-white/10 hover:border-white/25'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => focusAnnotation(annotation)}
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <span className="min-w-0">
                          <span className="mb-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white">
                              {shapeIcon(annotation.shape, isThumb)}
                              {isThumb
                                ? thumbLabel
                                : annotation.end_time_sec != null
                                  ? formatTimeRange(annotation.time_sec, annotation.end_time_sec)
                                  : formatTimecode(annotation.time_sec)}
                            </span>
                            <span className={cls('rounded border px-2 py-0.5 text-[11px] font-bold', statusTone(annotation.status))}>
                              {annotationStatusLabel(annotation.status)}
                            </span>
                            <span className={cls('rounded px-2 py-0.5 text-[11px] font-bold', roleTone(annotation.author_role))}>
                              {authorRoleLabel(annotation.author_role)}
                            </span>
                          </span>
                          <span className="block text-sm font-bold text-white">{annotation.author_name}</span>
                        </span>
                        {annotation.priority === 'high' && (
                          <span className="rounded bg-red-300/15 px-2 py-1 text-[11px] font-bold text-red-100">
                            중요
                          </span>
                        )}
                      </button>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/70">{annotation.body}</p>

                      {mode === 'admin' && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {REVIEW_ANNOTATION_STATUS_OPTIONS.map((status) => (
                            <button
                              key={status.value}
                              type="button"
                              disabled={busy}
                              onClick={() => patchAnnotation(annotation, { status: status.value })}
                              className={cls(
                                'inline-flex h-7 items-center gap-1 rounded border px-2 text-[11px] font-bold transition',
                                annotation.status === status.value
                                  ? 'border-brand bg-brand/10 text-brand'
                                  : 'border-white/10 text-white/45 hover:border-white/30 hover:text-white'
                              )}
                            >
                              {status.value === 'approved' ? <CheckCircle2 size={12} /> : <Circle size={10} />}
                              {status.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              patchAnnotation(annotation, {
                                priority: annotation.priority === 'high' ? 'normal' : 'high',
                              })
                            }
                            className="h-7 rounded border border-white/10 px-2 text-[11px] font-bold text-white/45 transition hover:border-red-300/40 hover:text-red-100"
                          >
                            중요
                          </button>
                        </div>
                      )}

                      <div className="mt-3 space-y-2">
                        {annotation.replies.map((reply) => (
                          <div key={reply.id} className="rounded border border-white/10 bg-black/30 p-2">
                            <p className="text-xs font-bold text-white">
                              {reply.author_name}
                              <span className="ml-2 font-normal text-white/35">{authorRoleLabel(reply.author_role)}</span>
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/60">{reply.body}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <input
                          value={replyText[annotation.id] ?? ''}
                          onChange={(event) =>
                            setReplyText((prev) => ({ ...prev, [annotation.id]: event.target.value }))
                          }
                          placeholder="답글"
                          className="h-9 min-w-0 flex-1 rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
                        />
                        <button
                          type="button"
                          disabled={busy || !(replyText[annotation.id] ?? '').trim()}
                          onClick={() => submitReply(annotation)}
                          className="inline-flex h-9 w-10 items-center justify-center rounded bg-white text-black transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="답글 저장"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
