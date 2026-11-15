"use client";

import { useState } from "react";
import { Photo } from "@/components/photo";

export type VideoItem = {
  id: string;
  url: string;
  posterUrl: string | null;
  title: string;
  meta: string; // e.g. "6:42 AM · 0:48"
};

// One large player plus a thumbnail per video. preload="none" means a video
// is only downloaded when the customer presses play (NFR-02).
export function HarvestVideos({ videos, label }: { videos: VideoItem[]; label: string }) {
  const [index, setIndex] = useState(0);
  const current = videos[index];
  if (!current) return null;

  return (
    <div className="space-y-3">
      <video
        key={current.id}
        src={current.url}
        poster={current.posterUrl ?? undefined}
        controls
        playsInline
        preload="none"
        aria-label={`${label}: ${current.title}`}
        className="aspect-video w-full rounded-[20px] bg-ink object-cover"
      />
      <div>
        <p className="font-semibold text-ink">{current.title}</p>
        <p className="text-sm text-muted">{current.meta}</p>
      </div>
      {videos.length > 1 && (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {videos.map((v, i) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                className={`flex w-full items-center gap-2.5 rounded-2xl bg-white p-2 text-left transition ${
                  i === index ? "border-2 border-leaf" : "border border-line hover:border-[#CFC7B5]"
                }`}
              >
                <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-line">
                  {v.posterUrl && <Photo src={v.posterUrl} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{v.title}</span>
                  <span className="block text-xs text-muted">{v.meta}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
