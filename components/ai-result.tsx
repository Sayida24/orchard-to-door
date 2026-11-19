"use client";

/* eslint-disable @next/next/no-img-element -- packing photos are storage URLs */
import { useEffect, useRef, useState } from "react";
import { AI_COLORS, AI_LABELS, type AiFrame, drawBoxes, summaryLine, type StoredAi } from "@/lib/inspection";

/** The checked frame closest to time `t` (frames are about ¼–½ second apart). */
function frameAt(frames: AiFrame[], t: number) {
  let best: AiFrame | null = null;
  for (const f of frames) if (!best || Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
  return best && Math.abs(best.t - t) <= 0.6 ? best : null;
}

/**
 * Shows an AI packing check: the seller's video (or photo) with the model's boxes drawn
 * over it ("Healthy 94%"), and the share of mangoes per label underneath.
 */
export function AiResultView({ data }: { data: StoredAi }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const s = data.summary;

  // Redraw the boxes for whatever moment of the video is showing.
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          const frame = data.kind === "video" ? frameAt(data.frames, videoRef.current?.currentTime ?? 0) : data.frames[0];
          if (showBoxes && frame) drawBoxes(ctx, frame.b, w, h);
        }
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [data, showBoxes]);

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl bg-ink"
        style={{ aspectRatio: `${data.width} / ${data.height}`, maxWidth: `calc(70vh * ${data.width / data.height})` }}
      >
        {data.kind === "video" ? (
          <video
            ref={videoRef}
            src={data.mediaUrl}
            controls
            playsInline
            preload="metadata"
            aria-label="Packing video checked by AI"
            className="absolute inset-0 h-full w-full object-fill"
          />
        ) : (
          <img src={data.mediaUrl} alt="Packing photo checked by AI" className="absolute inset-0 h-full w-full object-fill" />
        )}
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
        <input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} className="h-4 w-4 accent-[#1F4D2B]" />
        Show AI boxes
      </label>

      {s.diseased > 0 ? (
        <p role="status" className="rounded-2xl border border-[#F2D9A6] bg-mango-soft px-4 py-3 text-sm font-semibold text-[#4A2E00]">
          {s.diseased} of {s.total} mangoes may have a disease. {summaryLine(s)}.
        </p>
      ) : (
        <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-leaf">
          All {s.total} mangoes look healthy.
        </p>
      )}

      <ul className="space-y-2.5" aria-label="Mangoes per label">
        {AI_LABELS.map((name, i) =>
          s.counts[i] ? (
            <li key={name} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AI_COLORS[i] }} />
                  {name}
                </span>
                <span className="text-ink">
                  <strong>{s.percent[i]}%</strong> · {s.counts[i]} {s.counts[i] === 1 ? "mango" : "mangoes"}
                  {s.avgConfidence[i] !== null && <span className="text-muted"> · AI sure {Math.round(s.avgConfidence[i]!)}%</span>}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full" style={{ width: `${s.percent[i]}%`, backgroundColor: AI_COLORS[i] }} />
              </div>
            </li>
          ) : null,
        )}
      </ul>
      <p className="text-xs text-muted">
        The percentage is each label&apos;s share of the {s.total} mangoes found. &ldquo;AI sure&rdquo; is how confident the
        model was, on average. It&apos;s an aid, not a guarantee.
      </p>
    </div>
  );
}
