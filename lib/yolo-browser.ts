// Runs Orchiva's YOLOv8 mango model (exported to ONNX) in the seller's browser with
// ONNX Runtime Web. Browser-only: call these functions from client components.
import { AI_LABELS, type AiBox, type AiFrame, type AiItem, type AiResult, drawBoxes, MAX_VIDEO_SECONDS } from "@/lib/inspection";

const ORT_VERSION = "1.20.1";
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const MODEL_URL = "/models/mango-yolov8n.onnx";
const SIZE = 640; // the model's input size
const CONF = 0.35; // weaker detections are ignored
const IOU = 0.45; // overlapping boxes above this are the same mango
const FAST_FPS = 4; // video frames checked per second on quick devices…
const SLOW_FPS = 2; // …and on slow ones (decided after timing the first frame)
const MIN_FRAMES = 2; // in a video, a mango must be seen this often to count

type OrtTensor = { data: Float32Array; dims: readonly number[] };
type OrtSession = {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
};
type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
  InferenceSession: { create(url: string, options: { executionProviders: string[] }): Promise<OrtSession> };
};
declare global {
  interface Window {
    ort?: Ort;
  }
}

let ortPromise: Promise<Ort> | null = null;
function loadOrt(): Promise<Ort> {
  ortPromise ??= new Promise<Ort>((resolve, reject) => {
    if (window.ort) return resolve(window.ort);
    const s = document.createElement("script");
    s.src = `${ORT_BASE}ort.webgpu.min.js`; // WebGPU and plain WebAssembly in one file
    s.async = true;
    s.onload = () => (window.ort ? resolve(window.ort) : reject(new Error("The AI library didn't start.")));
    s.onerror = () => reject(new Error("The AI library couldn't be downloaded. Check the internet connection."));
    document.head.appendChild(s);
  }).catch((e) => {
    ortPromise = null;
    throw e;
  });
  return ortPromise;
}

let modelPromise: Promise<{ ort: Ort; session: OrtSession }> | null = null;
/** Downloads the library and the model once (about 12 MB, then cached by the browser). */
export function loadModel() {
  modelPromise ??= (async () => {
    const ort = await loadOrt();
    ort.env.wasm.wasmPaths = ORT_BASE;
    ort.env.wasm.numThreads = 1; // threads need special server headers; one is enough here
    // The graphics chip when the browser offers it (much faster), otherwise the CPU.
    const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ["webgpu", "wasm"] });
    return { ort, session };
  })().catch((e) => {
    modelPromise = null;
    throw e;
  });
  return modelPromise;
}

type Det = { x1: number; y1: number; x2: number; y2: number; label: number; conf: number };

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

function iou(a: Det, b: Det) {
  const w = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const h = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inter = w * h;
  const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
  return union > 0 ? inter / union : 0;
}

let input: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

/** Finds mangoes in one picture. Boxes come back as fractions of the picture. */
async function detect(source: CanvasImageSource, w: number, h: number): Promise<Det[]> {
  const { ort, session } = await loadModel();
  if (!input) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    input = { canvas, ctx: canvas.getContext("2d", { willReadFrequently: true })! };
  }
  // Letterbox: fit the picture into 640×640 without stretching, grey around it (as in training).
  const scale = Math.min(SIZE / w, SIZE / h);
  const nw = Math.round(w * scale), nh = Math.round(h * scale);
  const padX = Math.floor((SIZE - nw) / 2), padY = Math.floor((SIZE - nh) / 2);
  input.ctx.fillStyle = "rgb(114,114,114)";
  input.ctx.fillRect(0, 0, SIZE, SIZE);
  input.ctx.drawImage(source, padX, padY, nw, nh);
  const px = input.ctx.getImageData(0, 0, SIZE, SIZE).data;
  const area = SIZE * SIZE;
  const tensor = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    tensor[i] = px[i * 4] / 255;
    tensor[area + i] = px[i * 4 + 1] / 255;
    tensor[2 * area + i] = px[i * 4 + 2] / 255;
  }
  const outputs = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", tensor, [1, 3, SIZE, SIZE]) });
  const out = outputs[session.outputNames[0]];
  // YOLOv8 output: [1, 4 + classes, candidates]: centre x, centre y, width, height, then one score per label.
  const rows = out.dims[1], n = out.dims[2], d = out.data;
  const found: Det[] = [];
  for (let i = 0; i < n; i++) {
    let best = 0, label = 0;
    for (let c = 4; c < rows; c++) {
      const s = d[c * n + i];
      if (s > best) {
        best = s;
        label = c - 4;
      }
    }
    if (best < CONF) continue;
    const cx = d[i], cy = d[n + i], bw = d[2 * n + i], bh = d[3 * n + i];
    found.push({
      x1: clamp((cx - bw / 2 - padX) / scale / w),
      y1: clamp((cy - bh / 2 - padY) / scale / h),
      x2: clamp((cx + bw / 2 - padX) / scale / w),
      y2: clamp((cy + bh / 2 - padY) / scale / h),
      label,
      conf: best,
    });
  }
  // Keep the strongest box per mango.
  found.sort((a, b) => b.conf - a.conf);
  const kept: Det[] = [];
  for (const det of found) if (kept.every((k) => iou(k, det) < IOU)) kept.push(det);
  return kept;
}

const toBox = (d: Det): AiBox => [r3(d.x1), r3(d.y1), r3(d.x2), r3(d.y2), d.label, Math.round(d.conf * 100)];

type Track = { box: Det; last: number; frames: number; firstSeen: number; sum: number[]; hits: number[] };

/** Links this frame's boxes to the mangoes seen in the last few frames (or starts new ones). */
function follow(tracks: Track[], dets: Det[], frame: number, t: number) {
  const used = new Set<Track>();
  for (const det of dets) {
    let match: Track | null = null;
    let bestScore = 0.2;
    for (const tr of tracks) {
      if (used.has(tr) || frame - tr.last > 3) continue;
      const score = iou(tr.box, det);
      if (score > bestScore) {
        bestScore = score;
        match = tr;
      }
    }
    if (!match) {
      match = { box: det, last: frame, frames: 0, firstSeen: t, sum: AI_LABELS.map(() => 0), hits: AI_LABELS.map(() => 0) };
      tracks.push(match);
    }
    match.box = det;
    match.last = frame;
    match.frames += 1;
    match.sum[det.label] += det.conf;
    match.hits[det.label] += 1;
    used.add(match);
  }
}

function itemsFrom(tracks: Track[]): AiItem[] {
  const kept = tracks.filter((t) => t.frames >= MIN_FRAMES);
  return (kept.length ? kept : tracks).map((t) => {
    const label = t.sum.indexOf(Math.max(...t.sum));
    return { label, confidence: Math.round((t.sum[label] / t.hits[label]) * 1000) / 10, seenAt: Math.round(t.firstSeen * 10) / 10 };
  });
}

/** How far the check is (0–1) and the latest frame with its boxes drawn. */
export type Progress = { fraction: number; preview: HTMLCanvasElement };

function previewCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  const k = Math.min(1, 640 / Math.max(w, h));
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  return c;
}

function drawPreview(c: HTMLCanvasElement, source: CanvasImageSource, boxes: AiBox[]) {
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0, c.width, c.height);
  drawBoxes(ctx, boxes, c.width, c.height);
}

function waitFor(el: HTMLMediaElement, event: string, ms = 8000) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => cleanup(new Error("The video took too long to load.")), ms);
    const ok = () => cleanup();
    const bad = () => cleanup(new Error("This video can't be opened in this browser. Try an MP4 (H.264) video."));
    function cleanup(err?: Error) {
      clearTimeout(timer);
      el.removeEventListener(event, ok);
      el.removeEventListener("error", bad);
      if (err) reject(err);
      else resolve();
    }
    el.addEventListener(event, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}

/** Checks a video: about 4 frames a second, each mango counted once. */
export async function inspectVideo(file: File, onProgress: (p: Progress) => void): Promise<AiResult> {
  await loadModel();
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await waitFor(video, "loadeddata");
    let duration = video.duration;
    if (duration === Infinity) {
      // Some recordings (WebM) only reveal their length after a jump to the end.
      video.currentTime = 1e6;
      await waitFor(video, "seeked");
      duration = video.duration;
    }
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("This video seems to be empty.");
    if (duration > MAX_VIDEO_SECONDS + 1) throw new Error(`Keep the video under ${MAX_VIDEO_SECONDS} seconds.`);
    const w = video.videoWidth, h = video.videoHeight;
    const preview = previewCanvas(w, h);
    const tracks: Track[] = [];
    const frames: AiFrame[] = [];
    let step = 1 / FAST_FPS;
    let i = 0;
    for (let t = 0.05; t < duration - 0.05; t += step, i++) {
      const started = performance.now();
      video.currentTime = t;
      await waitFor(video, "seeked");
      const dets = await detect(video, w, h);
      if (i === 0 && performance.now() - started > 450) step = 1 / SLOW_FPS; // a slow device: fewer frames
      follow(tracks, dets, i, t);
      const b = dets.map(toBox);
      frames.push({ t: Math.round(t * 100) / 100, b });
      drawPreview(preview, video, b);
      onProgress({ fraction: Math.min(1, (t + step) / duration), preview });
    }
    return { kind: "video", width: w, height: h, duration: Math.round(duration * 10) / 10, items: itemsFrom(tracks), frames };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Checks a photo: every mango found counts once. */
export async function inspectPhoto(file: File, onProgress: (p: Progress) => void): Promise<AiResult> {
  await loadModel();
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This photo can't be opened. Try a JPG or PNG.");
  });
  const { width: w, height: h } = bitmap;
  const dets = await detect(bitmap, w, h);
  const b = dets.map(toBox);
  const preview = previewCanvas(w, h);
  drawPreview(preview, bitmap, b);
  bitmap.close();
  onProgress({ fraction: 1, preview });
  return {
    kind: "photo",
    width: w,
    height: h,
    duration: 0,
    items: dets.map((d) => ({ label: d.label, confidence: Math.round(d.conf * 1000) / 10, seenAt: 0 })),
    frames: [{ t: 0, b }],
  };
}

/** Runs a single AI pass on a live camera video or canvas, returning normalized boxes. */
export async function detectFrame(source: CanvasImageSource, w: number, h: number): Promise<AiBox[]> {
  if (w <= 0 || h <= 0) return [];
  const dets = await detect(source, w, h);
  return dets.map(toBox);
}