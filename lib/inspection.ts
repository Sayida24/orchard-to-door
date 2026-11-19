// AI inspection of a packed box (FR-14/15): the seller's browser runs Orchiva's YOLOv8
// model on a photo or a short video; the result is stored as JSON on the order's Box and
// drawn over the same video for the customer. Safe to import on the server and in the browser.

/** The model's labels, in the order it was trained with. */
export const AI_LABELS = ["Alternaria", "Anthracnose", "Healthy", "Scab"] as const;
export const HEALTHY = 2;
/** Box and bar colours per label (index matches AI_LABELS). */
export const AI_COLORS = ["#E65100", "#C62828", "#2E7D32", "#7B1FA2"];

export const MAX_VIDEO_SECONDS = 20;
// Cloudinary's free plan: up to 100 MB per video and 10 MB per photo.
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** One box: corners as fractions of the frame (0–1), label index, confidence 0–100. */
export type AiBox = [number, number, number, number, number, number];
export type AiFrame = { t: number; b: AiBox[] };
/** One mango (in a video: followed across frames, so counted once). */
export type AiItem = { label: number; confidence: number; seenAt: number };

export type AiResult = {
  kind: "video" | "photo";
  width: number;
  height: number;
  duration: number;
  items: AiItem[];
  frames: AiFrame[];
};

export type AiSummary = {
  total: number;
  healthy: number;
  diseased: number;
  /** Per label, in AI_LABELS order. */
  counts: number[];
  percent: number[];
  avgConfidence: (number | null)[];
};

export type StoredAi = AiResult & { mediaUrl: string; mediaPath: string; summary: AiSummary; checkedAt: string };

export function summarize(items: AiItem[]): AiSummary {
  const total = items.length;
  const counts = AI_LABELS.map((_, i) => items.filter((it) => it.label === i).length);
  const avgConfidence = AI_LABELS.map((_, i) => {
    const c = items.filter((it) => it.label === i).map((it) => it.confidence);
    return c.length ? Math.round((c.reduce((a, b) => a + b, 0) / c.length) * 10) / 10 : null;
  });
  return {
    total,
    healthy: counts[HEALTHY],
    diseased: total - counts[HEALTHY],
    counts,
    percent: counts.map((c) => (total ? Math.round((c * 1000) / total) / 10 : 0)),
    avgConfidence,
  };
}

/** "13 Healthy (93%) · 1 Anthracnose (7%)": the labels that were found. */
export function summaryLine(s: AiSummary) {
  return AI_LABELS.map((name, i) => (s.counts[i] ? `${s.counts[i]} ${name} (${Math.round(s.percent[i])}%)` : ""))
    .filter(Boolean)
    .join(" · ");
}

const num = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Checks a result sent from a browser before it's stored. Returns a clean copy, or null. */
export function parseAiResult(raw: unknown): AiResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== "video" && r.kind !== "photo") return null;
  if (!num(r.width, 1, 20000) || !num(r.height, 1, 20000) || !num(r.duration, 0, 600)) return null;
  if (!Array.isArray(r.items) || r.items.length > 500 || !Array.isArray(r.frames) || r.frames.length > 400) return null;
  const items: AiItem[] = [];
  for (const it of r.items) {
    const o = it as Record<string, unknown>;
    if (!num(o?.label, 0, AI_LABELS.length - 1) || !num(o?.confidence, 0, 100) || !num(o?.seenAt, 0, 600)) return null;
    items.push({ label: Math.round(o.label as number), confidence: o.confidence as number, seenAt: o.seenAt as number });
  }
  const frames: AiFrame[] = [];
  for (const f of r.frames) {
    const o = f as Record<string, unknown>;
    if (!num(o?.t, 0, 600) || !Array.isArray(o?.b) || (o.b as unknown[]).length > 100) return null;
    const b: AiBox[] = [];
    for (const box of o.b as unknown[]) {
      if (!Array.isArray(box) || box.length !== 6) return null;
      const [x1, y1, x2, y2, label, conf] = box;
      if (![x1, y1, x2, y2].every((v) => num(v, 0, 1)) || !num(label, 0, AI_LABELS.length - 1) || !num(conf, 0, 100)) return null;
      b.push([x1, y1, x2, y2, Math.round(label), Math.round(conf)]);
    }
    frames.push({ t: o.t as number, b });
  }
  return { kind: r.kind, width: r.width as number, height: r.height as number, duration: r.duration as number, items, frames };
}

/** Reads what's stored on a Box (its aiDetections JSON). */
export function parseStoredAi(raw: unknown): StoredAi | null {
  const base = parseAiResult(raw);
  const r = raw as Record<string, unknown> | null;
  if (!base || typeof r?.mediaUrl !== "string" || typeof r?.mediaPath !== "string") return null;
  return {
    ...base,
    mediaUrl: r.mediaUrl,
    mediaPath: r.mediaPath,
    checkedAt: typeof r.checkedAt === "string" ? r.checkedAt : "",
    summary: summarize(base.items),
  };
}

/** Draws boxes with "Healthy 94%" labels on a canvas that covers the photo or video. */
export function drawBoxes(ctx: CanvasRenderingContext2D, boxes: AiBox[], width: number, height: number) {
  const line = Math.max(2, Math.round(Math.min(width, height) / 220));
  const font = Math.max(11, Math.round(Math.min(width, height) / 32));
  ctx.lineWidth = line;
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  ctx.textBaseline = "top";
  for (const [x1, y1, x2, y2, label, conf] of boxes) {
    const x = x1 * width, y = y1 * height, w = (x2 - x1) * width, h = (y2 - y1) * height;
    const color = AI_COLORS[label] ?? "#555";
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, w, h);
    const text = `${AI_LABELS[label] ?? "?"} ${conf}%`;
    const tw = ctx.measureText(text).width + 8;
    const ty = y - font - 6 < 0 ? y : y - font - 6;
    ctx.fillStyle = color;
    ctx.fillRect(x - line / 2, ty, tw, font + 6);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, x + 4 - line / 2, ty + 3);
  }
}
