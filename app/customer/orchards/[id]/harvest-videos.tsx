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
        className="aspect-video w-full rounded-2xl bg-stone-900 object-cover"
      />
      <div>
        <p className="font-bold text-stone-900">{current.title}</p>
        <p className="text-sm text-stone-600">{current.meta}</p>
      </div>
      {videos.length > 1 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {videos.map((v, i) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                className={`w-full overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
                  i === index ? "border-amber-500" : "border-stone-200 hover:border-stone-400"
                }`}
              >
                <span className="block h-24 bg-stone-200">
                  {v.posterUrl && <Photo src={v.posterUrl} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="block px-3 py-2">
                  <span className="block text-sm font-bold leading-snug text-stone-900">{v.title}</span>
                  <span className="block text-xs text-stone-600">{v.meta}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
