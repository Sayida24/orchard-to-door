"use client";

import { Play, RotateCcw, RotateCw, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Photo } from "@/components/photo";

export type VideoItem = {
  id: string;
  url: string;
  posterUrl: string | null;
  title: string;
  meta: string; // e.g. "6:42 AM · 0:48"
};

function splitMeta(meta: string) {
  const parts = meta.split(" · ").filter(Boolean);
  const last = parts.at(-1);
  if (last && /^\d+:\d{2}$/.test(last)) {
    return { subMeta: parts.slice(0, -1).join(" · "), duration: last };
  }
  return { subMeta: meta, duration: null };
}

const controlBtn =
  "inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-[#CFC7B5] hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:pointer-events-none disabled:opacity-40";

// One large player plus a horizontal 16:9 filmstrip. preload="none" means a video
// is only downloaded when the customer presses play (NFR-02).
export function HarvestVideos({ videos, label }: { videos: VideoItem[]; label: string }) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const hasInteracted = useRef(false);
  const shouldPlayOnSwitch = useRef(false);

  const current = videos[index];

  useEffect(() => {
    if (!hasInteracted.current) return;
    itemRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    if (shouldPlayOnSwitch.current) {
      shouldPlayOnSwitch.current = false;
      videoRef.current?.play().catch(() => {});
    }
  }, [index]);

  if (!current) return null;

  function selectVideo(nextIndex: number) {
    const clamped = Math.max(0, Math.min(videos.length - 1, nextIndex));
    if (clamped === index) return;
    hasInteracted.current = true;
    shouldPlayOnSwitch.current = true;
    setIndex(clamped);
  }

  function seekBy(delta: number) {
    const el = videoRef.current;
    if (!el) return;
    const apply = () => {
      const max = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : Infinity;
      el.currentTime = Math.min(max, Math.max(0, el.currentTime + delta));
    };
    if (el.readyState >= 1) {
      apply();
    } else {
      el.addEventListener("loadedmetadata", apply, { once: true });
      el.load();
    }
  }

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        key={current.id}
        src={current.url}
        poster={current.posterUrl ?? undefined}
        controls
        playsInline
        preload="none"
        aria-label={`${label}: ${current.title}`}
        className="aspect-video w-full rounded-[20px] bg-ink object-cover"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{current.title}</p>
          <p className="text-sm text-muted">
            {current.meta}
            {videos.length > 1 && (
              <span className="ml-2 tabular-nums text-muted/80">
                · {index + 1} of {videos.length}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Video playback controls">
          {videos.length > 1 && (
            <button
              type="button"
              onClick={() => selectVideo(index - 1)}
              disabled={index === 0}
              aria-label="Play previous video"
              className={controlBtn}
            >
              <SkipBack className="h-3.5 w-3.5" aria-hidden="true" />
              Prev
            </button>
          )}
          <button
            type="button"
            onClick={() => seekBy(-5)}
            aria-label="Rewind 5 seconds"
            className={controlBtn}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            5s
          </button>
          <button
            type="button"
            onClick={() => seekBy(5)}
            aria-label="Forward 5 seconds"
            className={controlBtn}
          >
            5s
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {videos.length > 1 && (
            <button
              type="button"
              onClick={() => selectVideo(index + 1)}
              disabled={index === videos.length - 1}
              aria-label="Play next video"
              className={controlBtn}
            >
              Next
              <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {videos.length > 1 && (
        <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {videos.map((v, i) => {
            const active = i === index;
            const { subMeta, duration } = splitMeta(v.meta);
            return (
              <li
                key={v.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className="w-44 shrink-0 snap-start sm:w-48"
              >
                <button
                  type="button"
                  onClick={() => selectVideo(i)}
                  aria-pressed={active}
                  className="group block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  <span
                    className={`relative block aspect-video w-full overflow-hidden rounded-2xl bg-line transition ${
                      active
                        ? "ring-2 ring-leaf"
                        : "border border-line group-hover:border-[#CFC7B5]"
                    }`}
                  >
                    {v.posterUrl && (
                      <Photo
                        src={v.posterUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
                    />
                    {!active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition group-hover:scale-105 group-hover:bg-white"
                      >
                        <Play className="ml-0.5 h-4 w-4 fill-current" />
                      </span>
                    )}
                    {active && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-leaf px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                        Playing
                      </span>
                    )}
                    {duration && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                        {duration}
                      </span>
                    )}
                  </span>
                  <span
                    className={`mt-2 block truncate text-[13px] font-semibold ${
                      active ? "text-leaf" : "text-ink"
                    }`}
                  >
                    {v.title}
                  </span>
                  {subMeta && (
                    <span className="block truncate text-xs text-muted">{subMeta}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}