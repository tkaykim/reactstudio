'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
/* eslint-disable @next/next/no-img-element */
import {
  Check,
  ChevronDown,
  Clipboard,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  MessageSquare,
  Pause,
  PauseCircle,
  Play,
  Send,
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
  type ReviewAnnotationStatus,
  type ReviewAuthorRole,
  type ReviewRoomRow,
  type ReviewThumbnailRow,
  type ReviewVideoRow,
} from '@/lib/review-rooms';

type WorkspaceMode = 'admin' | 'public';

type StageTarget = 'video' | number; // number = thumbnail id

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
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

const AUTHOR_STORAGE_KEY = 'react-review-author';

// 종결 상태 = 처리완료·반려·확인완료 (미해결 필터에서 제외)
function isDone(annotation: ReviewAnnotationRow) {
  return annotation.status === 'resolved' || annotation.status === 'rejected' || annotation.status === 'approved';
}

function statusTone(status: ReviewAnnotationStatus) {
  if (status === 'approved') return 'border-white bg-white text-black';
  if (status === 'resolved') return 'border-white/20 bg-white/15 text-white';
  if (status === 'rejected') return 'border-red-300/25 bg-red-300/10 text-red-200';
  if (status === 'in_progress') return 'border-white/15 bg-white/5 text-white/70';
  return 'border-brand/30 bg-brand/10 text-brand';
}

function vLabel(label: string | null | undefined) {
  return (label ?? 'V1').toUpperCase();
}

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
  // 버전 스택: 오래된 것부터 V1..Vn
  const [videos, setVideos] = useState<ReviewVideoRow[]>(
    [...room.videos].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  );
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(
    room.videos.find((v) => v.is_current)?.id ?? room.videos[0]?.id ?? null
  );
  const selectedVideo = videos.find((v) => v.id === selectedVideoId) ?? null;
  const latestVideoId = videos[videos.length - 1]?.id ?? null;

  const [annotations, setAnnotations] = useState(room.annotations);
  const [thumbnails, setThumbnails] = useState<ReviewThumbnailRow[]>(room.thumbnails ?? []);
  const [stage, setStage] = useState<StageTarget>('video');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [authorRole, setAuthorRole] = useState<ReviewAuthorRole>(defaultAuthorRole);

  // 유튜브 댓글식 하단 코멘트 바: 입력 시작 시 일시정지 + 타임코드 고정
  const [barText, setBarText] = useState('');
  const [barStart, setBarStart] = useState(0);
  const [barFrozen, setBarFrozen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 코멘트 패널 필터
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);

  // 버전 메뉴
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [newVersionUrl, setNewVersionUrl] = useState('');

  // 상태 칩 드롭다운 (열려 있는 코멘트 id)
  const [statusMenuId, setStatusMenuId] = useState<number | null>(null);

  // 모바일 코멘트 바텀시트 (Figma 모바일 패턴): peek(접힘) / half / full
  const [sheetState, setSheetState] = useState<'peek' | 'half' | 'full'>('peek');
  const sheetDragY = useRef<number | null>(null);

  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const shareUrl = siteOrigin ? `${siteOrigin}${roomSharePath(room.share_token)}` : roomSharePath(room.share_token);
  const stageThumbnail = stage === 'video' ? null : thumbnails.find((t) => t.id === stage) ?? null;
  const onThumbnailStage = stageThumbnail !== null;

  // 작성자 정보는 브라우저에 1회 저장 (재방문 시 재입력 불필요)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { name?: string; role?: ReviewAuthorRole };
        if (!defaultAuthorName && parsed.name) setAuthorName(parsed.name);
        if (parsed.role) setAuthorRole(parsed.role);
      }
    } catch {
      // 저장값 파손 시 무시
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authorName.trim()) return;
    try {
      localStorage.setItem(AUTHOR_STORAGE_KEY, JSON.stringify({ name: authorName.trim(), role: authorRole }));
    } catch {
      // quota 등 실패는 무시
    }
  }, [authorName, authorRole]);

  useEffect(() => {
    if (!selectedVideo?.youtube_video_id || !playerHostRef.current) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !window.YT?.Player || !playerHostRef.current || !selectedVideo.youtube_video_id) return;
      playerHostRef.current.innerHTML = '';
      const player = new window.YT.Player(playerHostRef.current, {
        videoId: selectedVideo.youtube_video_id,
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
              setIsPlaying(player.getPlayerState?.() === 1);
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
      setIsPlaying(false);
    };
  }, [selectedVideo?.youtube_video_id]);

  function playerTime() {
    const time = playerRef.current?.getCurrentTime?.() ?? currentTime;
    return Number.isFinite(time) ? Math.max(0, time) : 0;
  }

  function togglePlay() {
    if (!playerRef.current) return;
    if (playerRef.current.getPlayerState?.() === 1) {
      playerRef.current.pauseVideo?.();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo?.();
      setIsPlaying(true);
    }
  }

  function seekTo(seconds: number, annotationId?: number) {
    playerRef.current?.seekTo?.(seconds, true);
    setCurrentTime(seconds);
    if (annotationId) setSelectedId(annotationId);
  }

  function switchStage(next: StageTarget) {
    setStage(next);
  }

  const SHEET_HEIGHTS: Record<'peek' | 'half' | 'full', string> = {
    peek: '4rem',
    half: '48dvh',
    full: 'calc(100dvh - 84px)',
  };

  function isMobileViewport() {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches;
  }

  function openSheetTo(state: 'peek' | 'half' | 'full') {
    if (isMobileViewport()) setSheetState(state);
  }

  // 코멘트 카드로 이동: 모바일이면 시트를 반쯤 올리고 해당 카드로 스크롤
  function revealAnnotationCard(id: number) {
    openSheetTo('half');
    setTimeout(() => {
      document.getElementById(`rc-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 250);
  }

  function handleSheetHandlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    sheetDragY.current = event.clientY;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // capture 실패해도 탭 동작은 유지
    }
  }

  function handleSheetHandlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (sheetDragY.current == null) return;
    const dy = event.clientY - sheetDragY.current;
    sheetDragY.current = null;
    const order = ['peek', 'half', 'full'] as const;
    const idx = order.indexOf(sheetState);
    if (Math.abs(dy) < 30) {
      // 탭: 접힘 ↔ 반열림
      setSheetState(sheetState === 'peek' ? 'half' : 'peek');
      return;
    }
    if (dy < 0 && idx < order.length - 1) setSheetState(order[idx + 1]);
    if (dy > 0 && idx > 0) setSheetState(order[idx - 1]);
  }

  function selectVersion(videoId: number) {
    setSelectedVideoId(videoId);
    setVersionMenuOpen(false);
    switchStage('video');
    setSelectedId(null);
    setCurrentTime(0);
    setBarFrozen(false);
  }

  function focusAnnotation(annotation: ReviewAnnotationRow) {
    setSelectedId(annotation.id);
    revealAnnotationCard(annotation.id);
    if (annotation.thumbnail_id) {
      if (thumbnails.some((t) => t.id === annotation.thumbnail_id)) switchStage(annotation.thumbnail_id);
      return;
    }
    if (annotation.video_id && annotation.video_id !== selectedVideoId) {
      setSelectedVideoId(annotation.video_id);
    }
    if (stage !== 'video') switchStage('video');
    seekTo(annotation.time_sec, annotation.id);
  }

  // 유튜브 댓글식: 입력을 시작하면 영상을 멈추고 그 시점 타임코드를 고정
  function freezeBarTime() {
    if (onThumbnailStage || barFrozen) return;
    playerRef.current?.pauseVideo?.();
    setIsPlaying(false);
    setBarStart(playerTime());
    setBarFrozen(true);
  }

  function recaptureBarTime() {
    setBarStart(playerTime());
    setBarFrozen(true);
  }

  async function postAnnotation(payload: Record<string, unknown>) {
    const res = await fetch(`/api/reviews/${encodeURIComponent(room.share_token)}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author_name: authorName,
        author_role: authorRole,
        ...payload,
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error ?? '댓글 저장에 실패했습니다.');
    setAnnotations((prev) => [...prev, result.annotation].sort((a, b) => a.time_sec - b.time_sec));
    setSelectedId(result.annotation.id);
    return result.annotation as ReviewAnnotationRow;
  }

  async function submitBar() {
    if (!barText.trim() || !authorName.trim()) return;
    setBusy(true);
    setError('');
    try {
      if (onThumbnailStage) {
        await postAnnotation({ body: barText, shape: 'time', time_sec: 0, thumbnail_id: stageThumbnail?.id });
      } else {
        await postAnnotation({ body: barText, shape: 'time', time_sec: barFrozen ? barStart : playerTime() });
      }
      setBarText('');
      setBarFrozen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(annotation: ReviewAnnotationRow, nextStatus: ReviewAnnotationStatus) {
    if (!authorName.trim()) {
      setError('상태를 변경하려면 먼저 이름을 입력해주세요.');
      setStatusMenuId(null);
      return;
    }
    setStatusMenuId(null);
    if (annotation.status === nextStatus) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/reviews/${encodeURIComponent(room.share_token)}/annotations/${annotation.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus, author_name: authorName, author_role: authorRole }),
        }
      );
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

  async function submitReply(annotation: ReviewAnnotationRow) {
    const text = replyText[annotation.id]?.trim();
    if (!text || !authorName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/reviews/${encodeURIComponent(room.share_token)}/annotations/${annotation.id}/replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text, author_name: authorName, author_role: authorRole }),
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

  async function addVersion() {
    if (!newVersionUrl.trim() || !authorName.trim()) {
      setError('이름과 YouTube URL을 입력해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(room.share_token)}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: newVersionUrl, author_name: authorName, author_role: authorRole }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '버전 추가에 실패했습니다.');
      setVideos((prev) => [
        ...prev.map((v) => ({ ...v, is_current: false })),
        result.video as ReviewVideoRow,
      ]);
      setNewVersionUrl('');
      setVersionMenuOpen(false);
      selectVersion(result.video.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '버전 추가에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadThumbnail(file: File) {
    if (!authorName.trim()) {
      setError('썸네일 업로드 전에 이름을 먼저 입력해주세요.');
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
      setError('시안을 선택하려면 먼저 이름을 입력해주세요.');
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
      ...annotations.map((a) => Math.max(Number(a.time_sec), Number(a.end_time_sec ?? 0)) + 10)
    );

  const selectedVideoAnnotations = useMemo(
    () => annotations.filter((a) => !a.thumbnail_id && a.video_id === selectedVideoId),
    [annotations, selectedVideoId]
  );

  // 패널 목록: 현재 버전(+썸네일) 또는 전체 버전, 미해결 필터
  const panelAnnotations = useMemo(() => {
    let list = annotations;
    if (!showAllVersions) {
      list = list.filter((a) => a.thumbnail_id != null || a.video_id === selectedVideoId);
    }
    if (openOnly) list = list.filter((a) => !isDone(a));
    return list;
  }, [annotations, showAllVersions, openOnly, selectedVideoId]);

  const openCount = annotations.filter((a) => !isDone(a)).length;

  const versionLabelByVideoId = useMemo(() => {
    const map = new Map<number, string>();
    videos.forEach((v) => map.set(v.id, vLabel(v.version_label)));
    return map;
  }, [videos]);

  const thumbnailCommentCount = (thumbnailId: number) =>
    annotations.filter((a) => a.thumbnail_id === thumbnailId).length;

  const needName = !authorName.trim();
  const barTimeDisplay = onThumbnailStage ? null : formatTimecode(barFrozen ? barStart : currentTime);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <main className={cls('mx-auto w-full space-y-4 px-3 py-4 sm:px-4 sm:py-5', mode === 'admin' ? 'max-w-7xl' : 'max-w-6xl')}>
        {/* 헤더: 제목 + 버전 스택 + 유틸 */}
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">REACT Review Room</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black sm:text-2xl">{room.title}</h1>
              {videos.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setVersionMenuOpen((v) => !v)}
                    className="inline-flex h-8 items-center gap-1.5 rounded border border-white/15 bg-white/5 px-2.5 text-xs font-black text-white transition hover:border-white/35"
                  >
                    <Layers size={13} className="text-white/45" />
                    {vLabel(selectedVideo?.version_label)}
                    {selectedVideoId === latestVideoId && <span className="font-bold text-white/35">최신</span>}
                    <ChevronDown size={13} className="text-white/45" />
                  </button>
                  {versionMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setVersionMenuOpen(false)}
                        aria-label="버전 메뉴 닫기"
                      />
                      <div className="absolute left-0 top-9 z-50 w-72 rounded-lg border border-white/15 bg-[#141414] p-1.5 shadow-2xl">
                        {[...videos].reverse().map((video) => {
                          const count = annotations.filter((a) => a.video_id === video.id).length;
                          const open = annotations.filter((a) => a.video_id === video.id && !isDone(a)).length;
                          return (
                            <button
                              key={video.id}
                              type="button"
                              onClick={() => selectVersion(video.id)}
                              className={cls(
                                'flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm transition',
                                video.id === selectedVideoId ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <span className="font-black">{vLabel(video.version_label)}</span>
                                {video.id === latestVideoId && (
                                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/55">최신</span>
                                )}
                              </span>
                              <span className="text-xs text-white/40">
                                댓글 {count}
                                {open > 0 && <span className="ml-1 text-brand">· 미해결 {open}</span>}
                              </span>
                            </button>
                          );
                        })}
                        <div className="mt-1.5 border-t border-white/10 p-2">
                          <p className="mb-1.5 text-[11px] font-bold text-white/45">새 버전(수정본) 추가 — YouTube URL</p>
                          <div className="flex gap-1.5">
                            <input
                              value={newVersionUrl}
                              onChange={(event) => setNewVersionUrl(event.target.value)}
                              placeholder="https://youtu.be/..."
                              className="h-8 min-w-0 flex-1 rounded border border-white/10 bg-black px-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-brand"
                            />
                            <button
                              type="button"
                              disabled={busy || !newVersionUrl.trim()}
                              onClick={addVersion}
                              className="h-8 rounded bg-white px-2.5 text-xs font-black text-black transition hover:bg-brand hover:text-white disabled:opacity-35"
                            >
                              추가
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
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
            {selectedVideo?.youtube_url && (
              <a
                href={selectedVideo.youtube_url}
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
          {/* 스테이지 + 타임라인 + 댓글 바 (모바일 sticky) */}
          <div className="sticky top-0 z-30 -mx-3 space-y-2 bg-[#080808] px-3 pb-2 sm:-mx-4 sm:px-4 xl:static xl:col-start-1 xl:row-start-1 xl:mx-0 xl:space-y-3 xl:bg-transparent xl:p-0">
            {/* 영상 스테이지 */}
            <div className={cls('relative aspect-video overflow-hidden rounded-md border border-white/10 bg-black', onThumbnailStage && 'hidden')}>
              {selectedVideo?.youtube_video_id ? (
                <div ref={playerHostRef} className="h-full w-full" />
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
                <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
                  <span className="rounded bg-black/70 px-2 py-1 text-[11px] font-bold text-white">
                    {stageThumbnail.label}
                  </span>
                  {stageThumbnail.status === 'selected' && (
                    <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-black text-black">
                      <Check size={12} />
                      선택됨
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 재생/정지 + 타임라인 (영상 스테이지에서만) */}
            {!onThumbnailStage && (
              <div className="rounded-md border border-white/10 bg-white/[0.025] p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-brand hover:text-white"
                    aria-label={isPlaying ? '일시정지' : '재생'}
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                  </button>
                  <span className="w-12 flex-shrink-0 text-xs font-bold tabular-nums text-white/60">
                    {formatTimecode(currentTime)}
                  </span>
                  <div
                    className="relative h-3 min-w-0 flex-1 cursor-pointer rounded-full bg-white/10"
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
                    {/* 구간(레거시) 밴드 표시 */}
                    {selectedVideoAnnotations
                      .filter((a) => a.end_time_sec != null)
                      .map((a) => (
                        <button
                          key={`range-${a.id}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            focusAnnotation(a);
                          }}
                          className={cls(
                            'absolute top-1/2 h-3 -translate-y-1/2 rounded-full transition',
                            selectedId === a.id ? 'bg-brand/70' : 'bg-brand/35 hover:bg-brand/60'
                          )}
                          style={{
                            left: `${Math.min(100, (a.time_sec / markerDuration) * 100)}%`,
                            width: `${Math.max(1, ((Number(a.end_time_sec) - a.time_sec) / markerDuration) * 100)}%`,
                          }}
                          aria-label={`${formatTimeRange(a.time_sec, a.end_time_sec)} 댓글`}
                        />
                      ))}
                    {/* 타임코드 댓글 마커 */}
                    {selectedVideoAnnotations
                      .filter((a) => a.end_time_sec == null)
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            focusAnnotation(a);
                          }}
                          className={cls(
                            'absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition',
                            selectedId === a.id ? 'bg-brand' : isDone(a) ? 'bg-white/35 hover:bg-white' : 'bg-white hover:bg-brand'
                          )}
                          style={{ left: `${Math.min(100, (a.time_sec / markerDuration) * 100)}%` }}
                          aria-label={`${formatTimecode(a.time_sec)} 댓글`}
                        />
                      ))}
                  </div>
                  <span className="w-12 flex-shrink-0 text-right text-xs tabular-nums text-white/30">
                    {formatTimecode(markerDuration)}
                  </span>
                </div>
              </div>
            )}

            {/* 유튜브 댓글식 하단 댓글 바 */}
            <div className="rounded-md border border-white/10 bg-white/[0.025] p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  placeholder="이름"
                  className="h-9 w-24 rounded border border-white/10 bg-black px-2.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-brand"
                />
                <select
                  value={authorRole}
                  onChange={(event) => setAuthorRole(event.target.value as ReviewAuthorRole)}
                  className="h-9 rounded border border-white/10 bg-black px-2 text-xs text-white outline-none focus:border-brand"
                >
                  {REVIEW_AUTHOR_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {barTimeDisplay && (
                  <button
                    type="button"
                    onClick={recaptureBarTime}
                    className={cls(
                      'inline-flex h-9 items-center gap-1.5 rounded border px-2.5 text-xs font-black tabular-nums transition',
                      barFrozen
                        ? 'border-brand/40 bg-brand/10 text-brand'
                        : 'border-white/10 text-white/55 hover:border-white/25 hover:text-white'
                    )}
                    title="현재 재생 위치로 타임코드 다시 잡기"
                  >
                    <Clock3 size={13} />
                    {barTimeDisplay}
                  </button>
                )}
                <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
                  <input
                    value={barText}
                    onChange={(event) => setBarText(event.target.value)}
                    onFocus={freezeBarTime}
                    onBlur={() => {
                      if (!barText.trim()) setBarFrozen(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitBar();
                    }}
                    placeholder={
                      onThumbnailStage
                        ? `${stageThumbnail?.label ?? '썸네일'}에 댓글...`
                        : `${barTimeDisplay} 시점에 댓글 남기기...`
                    }
                    className="h-9 min-w-0 flex-1 rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
                  />
                  <button
                    type="button"
                    disabled={busy || !barText.trim() || needName}
                    onClick={submitBar}
                    className="inline-flex h-9 w-10 flex-shrink-0 items-center justify-center rounded bg-white text-black transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="댓글 등록"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
              {error && <p className="mt-2 rounded border border-red-300/20 bg-red-300/10 p-2 text-xs text-red-100">{error}</p>}
            </div>
          </div>

          {/* 미디어 레일: 영상 + 썸네일 시안 */}
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
              영상 {vLabel(selectedVideo?.version_label)}
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
                      <Check size={12} />
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

          {/* 댓글 패널 — 모바일: 바텀시트(Figma 모바일 패턴) / 데스크톱: 우측 고정 패널 */}
          <aside
            className={cls(
              'fixed inset-x-0 bottom-0 z-40 flex h-[var(--sheet-h)] flex-col rounded-t-2xl border border-b-0 border-white/15 bg-[#0e0e0e] shadow-[0_-10px_40px_rgba(0,0,0,0.7)] transition-[height] duration-300',
              'xl:static xl:z-auto xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:h-auto xl:rounded-none xl:border-0 xl:bg-transparent xl:shadow-none xl:transition-none'
            )}
            style={{ ['--sheet-h' as string]: SHEET_HEIGHTS[sheetState] }}
          >
            {/* 모바일 시트 핸들: 탭=접기/펴기, 위아래 스와이프=단계 이동 */}
            <div
              className="flex-shrink-0 cursor-grab touch-none select-none xl:hidden"
              onPointerDown={handleSheetHandlePointerDown}
              onPointerUp={handleSheetHandlePointerUp}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setSheetState((prev) => (prev === 'peek' ? 'half' : 'peek'));
                }
              }}
              aria-label="댓글 패널 열기/닫기"
            >
              <div className="flex justify-center pt-2.5">
                <span className="h-1 w-10 rounded-full bg-white/25" />
              </div>
              <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-1.5">
                <span className="inline-flex items-center gap-2 text-sm font-black text-white">
                  <MessageSquare size={15} className="text-white/40" />
                  댓글 {panelAnnotations.length}
                  {openCount > 0 && <span className="text-xs font-bold text-brand">미해결 {openCount}</span>}
                </span>
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSheetState((prev) => (prev === 'full' ? 'half' : 'full'));
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/55 transition hover:text-white"
                  aria-label={sheetState === 'full' ? '시트 줄이기' : '전체 화면으로 펼치기'}
                >
                  <ChevronDown size={14} className={cls('transition-transform', sheetState !== 'full' && 'rotate-180')} />
                </button>
              </div>
            </div>

            {/* 필터 바 */}
            <div className="flex-shrink-0 border-b border-white/10 px-3 pb-2 xl:rounded-md xl:border xl:border-white/10 xl:bg-white/[0.025] xl:p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAllVersions(false)}
                    className={cls(
                      'h-7 rounded px-2.5 text-[11px] font-black transition',
                      !showAllVersions ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                    )}
                  >
                    {vLabel(selectedVideo?.version_label)} 버전
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllVersions(true)}
                    className={cls(
                      'h-7 rounded px-2.5 text-[11px] font-black transition',
                      showAllVersions ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                    )}
                  >
                    전체
                  </button>
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-white/55">
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(event) => setOpenOnly(event.target.checked)}
                    className="h-3.5 w-3.5 accent-white"
                  />
                  미해결만
                </label>
                <span className="hidden text-xs text-white/35 xl:inline">
                  {panelAnnotations.length}개{openCount > 0 && ` · 전체 미해결 ${openCount}`}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 pb-8 pt-2.5 xl:mt-3 xl:max-h-[calc(100vh-150px)] xl:flex-none xl:overflow-auto xl:px-0 xl:pb-0 xl:pr-1">
              {panelAnnotations.length === 0 ? (
                <div className="rounded-md border border-white/10 p-8 text-center text-sm leading-relaxed text-white/35">
                  아직 댓글이 없습니다.
                  <br />
                  영상을 보다가 아래 입력창을 탭하면 그 시점 타임코드로 댓글이 달립니다.
                </div>
              ) : (
                panelAnnotations.map((annotation) => {
                  const active = selectedId === annotation.id;
                  const done = isDone(annotation);
                  const isThumb = annotation.thumbnail_id != null;
                  const thumbLabel = isThumb
                    ? thumbnails.find((t) => t.id === annotation.thumbnail_id)?.label ?? '썸네일'
                    : null;
                  const versionLabel = annotation.video_id ? versionLabelByVideoId.get(annotation.video_id) : null;
                  return (
                    <article
                      key={annotation.id}
                      id={`rc-${annotation.id}`}
                      className={cls(
                        'rounded-md border bg-white/[0.025] p-3 transition',
                        active ? 'border-brand/60' : 'border-white/10 hover:border-white/25',
                        done && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* 상태 칩 + 드롭다운 */}
                        <div className="relative mt-0.5 flex-shrink-0">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setStatusMenuId((prev) => (prev === annotation.id ? null : annotation.id))}
                            className={cls(
                              'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-black transition hover:brightness-125',
                              statusTone(annotation.status)
                            )}
                            aria-label="상태 변경"
                            title="클릭해서 상태 변경"
                          >
                            {annotation.status === 'approved' && <Check size={10} />}
                            {annotationStatusLabel(annotation.status)}
                            <ChevronDown size={10} className="opacity-60" />
                          </button>
                          {statusMenuId === annotation.id && (
                            <>
                              <button
                                type="button"
                                className="fixed inset-0 z-40 cursor-default"
                                onClick={() => setStatusMenuId(null)}
                                aria-label="상태 메뉴 닫기"
                              />
                              <div className="absolute left-0 top-7 z-50 w-52 rounded-lg border border-white/15 bg-[#141414] p-1 shadow-2xl">
                                {REVIEW_ANNOTATION_STATUS_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setStatus(annotation, option.value)}
                                    className={cls(
                                      'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left transition',
                                      annotation.status === option.value ? 'bg-white/10' : 'hover:bg-white/5'
                                    )}
                                  >
                                    <span className="min-w-0">
                                      <span className={cls('inline-block rounded-full border px-2 py-0.5 text-[10px] font-black', statusTone(option.value))}>
                                        {option.label}
                                      </span>
                                      <span className="mt-0.5 block text-[10px] leading-tight text-white/40">{option.description}</span>
                                    </span>
                                    {annotation.status === option.value && <Check size={12} className="flex-shrink-0 text-white/70" />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => focusAnnotation(annotation)}
                            className="flex w-full flex-wrap items-center gap-1.5 text-left"
                          >
                            <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold text-white">
                              {isThumb ? (
                                <>
                                  <ImageIcon size={11} />
                                  {thumbLabel}
                                </>
                              ) : annotation.end_time_sec != null ? (
                                formatTimeRange(annotation.time_sec, annotation.end_time_sec)
                              ) : (
                                formatTimecode(annotation.time_sec)
                              )}
                            </span>
                            {!isThumb && videos.length > 1 && versionLabel && (
                              <span
                                className={cls(
                                  'rounded px-1.5 py-0.5 text-[10px] font-black',
                                  annotation.video_id === selectedVideoId
                                    ? 'bg-white/10 text-white/55'
                                    : 'bg-brand/15 text-brand'
                                )}
                              >
                                {versionLabel}
                              </span>
                            )}
                            <span className="text-xs font-bold text-white">{annotation.author_name}</span>
                            <span className="text-[10px] text-white/35">{authorRoleLabel(annotation.author_role)}</span>
                            {annotation.priority === 'high' && (
                              <span className="rounded bg-red-300/15 px-1.5 py-0.5 text-[10px] font-bold text-red-100">중요</span>
                            )}
                          </button>

                          <p
                            className={cls(
                              'mt-1.5 whitespace-pre-wrap text-sm leading-relaxed',
                              annotation.status === 'rejected'
                                ? 'text-white/40'
                                : done
                                  ? 'text-white/40 line-through'
                                  : 'text-white/75'
                            )}
                          >
                            {annotation.body}
                          </p>

                          {annotation.replies.length > 0 && (
                            <div className="mt-2 space-y-1.5 border-l border-white/10 pl-2.5">
                              {annotation.replies.map((reply) => (
                                <div key={reply.id}>
                                  <p className="text-[11px] font-bold text-white">
                                    {reply.author_name}
                                    <span className="ml-1.5 font-normal text-white/35">{authorRoleLabel(reply.author_role)}</span>
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">{reply.body}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 flex gap-1.5">
                            <input
                              value={replyText[annotation.id] ?? ''}
                              onChange={(event) => setReplyText((prev) => ({ ...prev, [annotation.id]: event.target.value }))}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') submitReply(annotation);
                              }}
                              placeholder="답글"
                              className="h-8 min-w-0 flex-1 rounded border border-white/10 bg-black px-2.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-brand"
                            />
                            <button
                              type="button"
                              disabled={busy || !(replyText[annotation.id] ?? '').trim() || needName}
                              onClick={() => submitReply(annotation)}
                              className="inline-flex h-8 w-9 items-center justify-center rounded bg-white/10 text-white/70 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="답글 저장"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </aside>
        </div>

        {/* 모바일: 바텀시트 peek 높이만큼 하단 여백 확보 */}
        <div className="h-16 xl:hidden" />
      </main>
    </div>
  );
}
