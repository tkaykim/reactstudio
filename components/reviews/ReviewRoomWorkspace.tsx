'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Clock3,
  Clipboard,
  ExternalLink,
  LocateFixed,
  MessageSquare,
  PauseCircle,
  Send,
  SquareDashedMousePointer,
} from 'lucide-react';
import {
  REVIEW_ANNOTATION_STATUS_OPTIONS,
  REVIEW_AUTHOR_ROLE_OPTIONS,
  annotationStatusLabel,
  authorRoleLabel,
  formatTimecode,
  roomSharePath,
  type ReviewAnnotationRow,
  type ReviewAnnotationShape,
  type ReviewAnnotationStatus,
  type ReviewAuthorRole,
  type ReviewRoomRow,
} from '@/lib/review-rooms';

type WorkspaceMode = 'admin' | 'public';

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

function statusTone(status: ReviewAnnotationStatus) {
  if (status === 'approved') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'resolved') return 'border-sky-300/25 bg-sky-300/10 text-sky-100';
  if (status === 'in_progress') return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-brand/25 bg-brand/10 text-brand';
}

function roleTone(role: ReviewAuthorRole) {
  if (role === 'internal') return 'bg-white text-black';
  if (role === 'editor' || role === 'director') return 'bg-blue-300/15 text-blue-100';
  if (role === 'channel_owner') return 'bg-purple-300/15 text-purple-100';
  return 'bg-white/10 text-white/70';
}

function shapeIcon(shape: ReviewAnnotationShape) {
  if (shape === 'pin') return <LocateFixed size={13} />;
  if (shape === 'box') return <SquareDashedMousePointer size={13} />;
  return <Clock3 size={13} />;
}

function safePct(value: number | null | undefined, fallback = 0) {
  return Math.min(100, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback));
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
  const currentVideo = useMemo(
    () => room.videos.find((video) => video.is_current) ?? room.videos[0] ?? null,
    [room.videos]
  );
  const [annotations, setAnnotations] = useState(room.annotations);
  const [selectedId, setSelectedId] = useState<number | null>(room.annotations[0]?.id ?? null);
  const [placement, setPlacement] = useState<ReviewAnnotationShape>('time');
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorRole, setAuthorRole] = useState<ReviewAuthorRole>(defaultAuthorRole);
  const [body, setBody] = useState('');
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [draftPoint, setDraftPoint] = useState<{
    shape: ReviewAnnotationShape;
    x_pct: number | null;
    y_pct: number | null;
    w_pct: number | null;
    h_pct: number | null;
    time_sec: number;
  }>({
    shape: 'time',
    x_pct: null,
    y_pct: null,
    w_pct: null,
    h_pct: null,
    time_sec: 0,
  });

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const shareUrl = siteOrigin ? `${siteOrigin}${roomSharePath(room.share_token)}` : roomSharePath(room.share_token);

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

  function captureTime() {
    setDraftPoint({
      shape: 'time',
      x_pct: null,
      y_pct: null,
      w_pct: null,
      h_pct: null,
      time_sec: playerTime(),
    });
  }

  function capturePoint(event: MouseEvent<HTMLDivElement>) {
    if (placement === 'time') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setDraftPoint({
      shape: placement,
      x_pct: safePct(x),
      y_pct: safePct(y),
      w_pct: placement === 'box' ? 18 : null,
      h_pct: placement === 'box' ? 12 : null,
      time_sec: playerTime(),
    });
  }

  async function submitAnnotation() {
    if (!body.trim()) return;
    setBusy(true);
    setError('');
    try {
      const timeSec = draftPoint.shape === 'time' ? playerTime() : draftPoint.time_sec;
      const res = await fetch(`/api/reviews/${encodeURIComponent(room.share_token)}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          author_name: authorName,
          author_email: authorEmail,
          author_role: authorRole,
          time_sec: timeSec,
          shape: draftPoint.shape,
          x_pct: draftPoint.x_pct,
          y_pct: draftPoint.y_pct,
          w_pct: draftPoint.w_pct,
          h_pct: draftPoint.h_pct,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? '코멘트 저장에 실패했습니다.');
      setAnnotations((prev) => [...prev, result.annotation].sort((a, b) => a.time_sec - b.time_sec));
      setSelectedId(result.annotation.id);
      setBody('');
      setDraftPoint({
        shape: placement,
        x_pct: null,
        y_pct: null,
        w_pct: null,
        h_pct: null,
        time_sec: playerTime(),
      });
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

  async function copyShare() {
    await navigator.clipboard.writeText(shareUrl);
  }

  const markerDuration =
    duration || Math.max(1, ...annotations.map((annotation) => Number(annotation.time_sec) + 10));

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <main className={cls('mx-auto w-full space-y-4 px-4 py-5', mode === 'admin' ? 'max-w-7xl' : 'max-w-6xl')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">REACT Review Room</p>
            <h1 className="mt-1 text-2xl font-black">{room.title}</h1>
            <p className="mt-1 text-sm text-white/45">
              {room.client_name ?? '클라이언트 미지정'} · {room.project_name ?? '프로젝트 미연결'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === 'admin' && (
              <Link
                href="/admin/reviews"
                className="inline-flex h-9 items-center rounded border border-white/10 px-3 text-xs font-bold text-white/60 transition hover:border-brand hover:text-brand"
              >
                목록
              </Link>
            )}
            <button
              type="button"
              onClick={copyShare}
              className="inline-flex h-9 items-center gap-2 rounded border border-white/10 px-3 text-xs font-bold text-white/60 transition hover:border-brand hover:text-brand"
            >
              <Clipboard size={14} />
              공유 링크
            </button>
            {currentVideo?.youtube_url && (
              <a
                href={currentVideo.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded border border-white/10 px-3 text-xs font-bold text-white/60 transition hover:border-brand hover:text-brand"
              >
                <ExternalLink size={14} />
                YouTube
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <section className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-md border border-white/10 bg-black">
              {currentVideo?.youtube_video_id ? (
                <>
                  <div ref={playerHostRef} className="h-full w-full" />
                  <div className="pointer-events-none absolute inset-0">
                    {placement !== 'time' && (
                      <div
                        className="pointer-events-auto absolute inset-0 cursor-crosshair"
                        onClick={capturePoint}
                        title="화면 위치 선택"
                      />
                    )}
                    {annotations
                      .filter((annotation) => annotation.video_id === currentVideo.id && annotation.x_pct != null && annotation.y_pct != null)
                      .map((annotation) => {
                        const active = selectedId === annotation.id;
                        const x = safePct(annotation.x_pct);
                        const y = safePct(annotation.y_pct);
                        const w = safePct(annotation.w_pct, 14);
                        const h = safePct(annotation.h_pct, 10);
                        return annotation.shape === 'box' ? (
                          <button
                            key={annotation.id}
                            type="button"
                            onClick={() => seekTo(annotation.time_sec, annotation.id)}
                            className={cls(
                              'pointer-events-auto absolute rounded border-2 transition',
                              active ? 'border-brand bg-brand/15' : 'border-white/80 bg-black/10 hover:border-brand'
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
                            onClick={() => seekTo(annotation.time_sec, annotation.id)}
                            className={cls(
                              'pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-black shadow-lg transition',
                              active
                                ? 'border-brand bg-brand text-white'
                                : 'border-white bg-black/75 text-white hover:border-brand hover:text-brand'
                            )}
                            style={{ left: `${x}%`, top: `${y}%` }}
                            aria-label={`코멘트 ${annotation.id}`}
                          >
                            {annotation.id}
                          </button>
                        );
                      })}
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

            <div className="rounded-md border border-white/10 bg-white/[0.025] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-white/45">{formatTimecode(currentTime)}</span>
                <span className="text-xs text-white/30">{formatTimecode(markerDuration)}</span>
              </div>
              <div className="relative h-3 rounded-full bg-white/10">
                <div
                  className="absolute top-0 h-3 rounded-full bg-white/25"
                  style={{ width: `${Math.min(100, (currentTime / markerDuration) * 100)}%` }}
                />
                {annotations.map((annotation) => (
                  <button
                    key={annotation.id}
                    type="button"
                    onClick={() => seekTo(annotation.time_sec, annotation.id)}
                    className={cls(
                      'absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition',
                      selectedId === annotation.id ? 'bg-brand' : 'bg-white hover:bg-brand'
                    )}
                    style={{ left: `${Math.min(100, (annotation.time_sec / markerDuration) * 100)}%` }}
                    aria-label={`${formatTimecode(annotation.time_sec)} 코멘트`}
                  />
                ))}
              </div>
            </div>

            <section className="rounded-md border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-3 grid gap-2 md:grid-cols-[1fr_1fr_0.8fr]">
                <input
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  placeholder="이름"
                  className="h-10 rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
                />
                <input
                  value={authorEmail}
                  onChange={(event) => setAuthorEmail(event.target.value)}
                  placeholder="이메일"
                  className="h-10 rounded border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand"
                />
                <select
                  value={authorRole}
                  onChange={(event) => setAuthorRole(event.target.value as ReviewAuthorRole)}
                  className="h-10 rounded border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-brand"
                >
                  {REVIEW_AUTHOR_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  { value: 'time' as const, label: '타임코드', icon: Clock3 },
                  { value: 'pin' as const, label: '핀', icon: LocateFixed },
                  { value: 'box' as const, label: '영역', icon: SquareDashedMousePointer },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setPlacement(item.value);
                        if (item.value === 'time') captureTime();
                      }}
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
                <button
                  type="button"
                  onClick={captureTime}
                  className="inline-flex h-9 items-center rounded border border-white/10 px-3 text-xs font-bold text-white/55 transition hover:border-brand hover:text-brand"
                >
                  현재 {formatTimecode(playerTime())}
                </button>
                <span className="inline-flex h-9 items-center rounded border border-white/10 px-3 text-xs text-white/35">
                  선택 {formatTimecode(draftPoint.time_sec)}
                  {draftPoint.x_pct != null && ` · ${Math.round(draftPoint.x_pct)}%, ${Math.round(draftPoint.y_pct ?? 0)}%`}
                </span>
              </div>

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
          </section>

          <aside className="space-y-3">
            <div className="rounded-md border border-white/10 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-sm font-black">
                  <MessageSquare size={16} className="text-brand" />
                  코멘트
                </h2>
                <span className="text-xs text-white/35">{annotations.length}개</span>
              </div>
            </div>

            <div className="max-h-[calc(100vh-150px)] space-y-3 overflow-auto pr-1">
              {annotations.length === 0 ? (
                <div className="rounded-md border border-white/10 p-8 text-center text-sm text-white/35">
                  아직 코멘트가 없습니다.
                </div>
              ) : (
                annotations.map((annotation) => {
                  const active = selectedId === annotation.id;
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
                        onClick={() => seekTo(annotation.time_sec, annotation.id)}
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <span className="min-w-0">
                          <span className="mb-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-white">
                              {shapeIcon(annotation.shape)}
                              {formatTimecode(annotation.time_sec)}
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
