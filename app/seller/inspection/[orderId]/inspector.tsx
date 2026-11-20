"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiResultView } from "@/components/ai-result";
import {
  type AiBox,
  type AiResult,
  drawBoxes,
  HEALTHY,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  summarize,
} from "@/lib/inspection";
import { detectFrame, inspectPhoto, inspectVideo, loadModel, type Progress } from "@/lib/yolo-browser";
import { prepareUpload, saveInspection } from "../actions";

type Phase =
  | { name: "idle" }
  | { name: "loading" }
  | { name: "camera"; recording: boolean; elapsedSec: number }
  | { name: "checking"; fraction: number }
  | { name: "checked"; result: AiResult; file: File; localUrl: string }
  | { name: "saving"; result: AiResult; file: File; localUrl: string; uploaded: number };

/** Posts the file to Cloudinary with the signed pass, reporting progress (0–1). */
function upload(url: string, fields: Record<string, string>, file: File, onProgress: (p: number) => void) {
  return new Promise<string | null>((resolve) => {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    body.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(null);
      let detail = "";
      try {
        detail = JSON.parse(xhr.responseText)?.error?.message ?? "";
      } catch {}
      resolve(detail ? `The upload failed: ${detail}` : "The upload failed. Please try again.");
    };
    xhr.onerror = () => resolve("The upload failed. Check the internet connection and try again.");
    xhr.send(body);
  });
}

function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold disabled:cursor-not-allowed disabled:opacity-60";

// The seller's AI check of a packed box. Supports live camera (with real-time AI boxes +
// video/photo capture) as well as uploading an existing video or photo.
export function Inspector({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [liveAiReady, setLiveAiReady] = useState(false);
  const [liveCounts, setLiveCounts] = useState<{ total: number; healthy: number; diseased: number }>({
    total: 0,
    healthy: 0,
    diseased: 0,
  });

  const previewHost = useRef<HTMLDivElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveLoopActiveRef = useRef(false);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const discardRecordingRef = useRef(false);

  const localUrl = "localUrl" in phase ? phase.localUrl : null;
  useEffect(() => () => void (localUrl && URL.revokeObjectURL(localUrl)), [localUrl]);

  const stopCamera = useCallback((discardRecording = true) => {
    liveLoopActiveRef.current = false;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      discardRecordingRef.current = discardRecording;
      try {
        recorderRef.current.stop();
      } catch {}
    }
    recorderRef.current = null;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(true), [stopCamera]);

  const check = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSavedNote(false);
    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) return setError("Choose a video or a photo.");
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      return setError(isVideo ? "The video must be under 100 MB." : "The photo must be under 10 MB.");
    }
    try {
      setPhase({ name: "loading" });
      await loadModel();
      setPhase({ name: "checking", fraction: 0 });
      const onProgress = ({ fraction, preview }: Progress) => {
        setPhase({ name: "checking", fraction });
        const host = previewHost.current;
        if (host && preview.parentElement !== host) {
          preview.className = "h-auto w-full rounded-2xl";
          host.replaceChildren(preview);
        }
      };
      const result = isVideo ? await inspectVideo(file, onProgress) : await inspectPhoto(file, onProgress);
      setPhase({ name: "checked", result, file, localUrl: URL.createObjectURL(file) });
    } catch (e) {
      setPhase({ name: "idle" });
      setError(e instanceof Error ? e.message : "The check didn't work. Please try again.");
    }
  }, []);

  const startLiveAiLoop = useCallback(() => {
    liveLoopActiveRef.current = true;
    setLiveAiReady(false);
    setLiveCounts({ total: 0, healthy: 0, diseased: 0 });

    void (async () => {
      try {
        await loadModel();
        if (!liveLoopActiveRef.current) return;
        setLiveAiReady(true);

        while (liveLoopActiveRef.current) {
          const video = liveVideoRef.current;
          const canvas = liveCanvasRef.current;
          if (video && canvas && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            const boxes: AiBox[] = await detectFrame(video, video.videoWidth, video.videoHeight);
            if (!liveLoopActiveRef.current) break;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              drawBoxes(ctx, boxes, canvas.width, canvas.height);
            }

            const healthy = boxes.filter((b) => b[4] === HEALTHY).length;
            setLiveCounts({ total: boxes.length, healthy, diseased: boxes.length - healthy });
          }
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch {
        // Model failed to load in live mode; capture & inspect will surface the error if needed.
      }
    })();
  }, []);

  async function openCamera(mode: "environment" | "user" = facingMode) {
    setError(null);
    setSavedNote(false);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Live camera isn't available in this browser (requires HTTPS or localhost). Choose a file instead.");
      return;
    }
    stopCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setFacingMode(mode);
      setPhase({ name: "camera", recording: false, elapsedSec: 0 });

      // Wait one animation frame so the <video> element mounts and binds to stream.
      requestAnimationFrame(() => {
        const video = liveVideoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play().catch(() => {});
        startLiveAiLoop();
      });
    } catch (e) {
      stopCamera(true);
      setPhase({ name: "idle" });
      if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")) {
        setError("Camera permission was denied. Allow camera access in your browser and try again.");
      } else if (e instanceof DOMException && e.name === "NotFoundError") {
        setError("No camera was found on this device. Choose a video or photo file instead.");
      } else {
        setError("Could not start the camera. Make sure no other app is using it and try again.");
      }
    }
  }

  function closeCamera() {
    stopCamera(true);
    setPhase({ name: "idle" });
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    if (typeof MediaRecorder === "undefined") {
      setError("Video recording isn't supported in this browser. Use Take photo instead.");
      return;
    }
    setError(null);
    chunksRef.current = [];
    discardRecordingRef.current = false;

    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      if (discardRecordingRef.current) {
        chunksRef.current = [];
        return;
      }
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      stopCamera(true);
      if (blob.size === 0) {
        setPhase({ name: "idle" });
        setError("The recorded video was empty. Please try again.");
        return;
      }
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const recordedFile = new File([blob], `live-inspection.${ext}`, { type });
      void check(recordedFile);
    };

    recorderRef.current = recorder;
    recorder.start(250);
    setPhase({ name: "camera", recording: true, elapsedSec: 0 });

    const startedAt = Date.now();
    recordTimerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000);
      if (sec >= MAX_VIDEO_SECONDS) {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
        return;
      }
      setPhase((prev) => (prev.name === "camera" && prev.recording ? { ...prev, elapsedSec: sec } : prev));
    }, 500);
  }

  function stopRecordingAndInspect() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      discardRecordingRef.current = false;
      recorderRef.current.stop();
    }
  }

  async function takePhotoAndInspect() {
    const video = liveVideoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setError("Camera isn't ready yet. Wait a second and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    stopCamera(true);
    if (!blob) {
      setPhase({ name: "idle" });
      setError("Could not capture a photo. Please try again.");
      return;
    }
    const photoFile = new File([blob], "live-inspection.jpg", { type: "image/jpeg" });
    await check(photoFile);
  }

  async function save() {
    if (phase.name !== "checked") return;
    const { result, file, localUrl } = phase;
    const back = (message: string) => {
      setPhase({ name: "checked", result, file, localUrl });
      setError(message);
    };
    setError(null);
    setPhase({ name: "saving", result, file, localUrl, uploaded: 0 });
    const kind = result.kind === "video" ? "video" : "image";
    try {
      const pass = await prepareUpload(orderId, kind, file.size);
      if (!pass.ok) return back(pass.error);
      const failed = await upload(pass.url, pass.fields, file, (uploaded) =>
        setPhase({ name: "saving", result, file, localUrl, uploaded }),
      );
      if (failed) return back(failed);
      const saved = await saveInspection(orderId, kind, pass.fields.public_id, result);
      if (!saved.ok) return back(saved.error);
      setPhase({ name: "idle" });
      setSavedNote(true);
      router.refresh(); // shows the saved result above
    } catch {
      back("Saving didn't work. Please try again.");
    }
  }

  const busy = phase.name === "loading" || phase.name === "checking" || phase.name === "saving";
  const canRecord = typeof MediaRecorder !== "undefined";

  return (
    <div className="space-y-4 rounded-3xl border border-line bg-white p-5">
      {savedNote && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-leaf">
          <span>Saved. Your box QR code is ready, and the customer sees this check once packed.</span>
          <Link href={`/seller/qr/${orderId}`} className="underline underline-offset-2 hover:text-leaf-dark">
            Print or download QR label →
          </Link>
        </div>
      )}

      {(phase.name === "idle" || phase.name === "loading") && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Open the box and inspect with your live camera (up to {MAX_VIDEO_SECONDS}s video or a quick photo), or upload
            an existing video or photo in good light.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void openCamera(facingMode)}
              className={`${button} bg-leaf text-white hover:bg-leaf-dark`}
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </svg>
              {phase.name === "loading" ? "Getting AI ready…" : "Open live camera"}
            </button>

            <label
              className={`${button} cursor-pointer border border-line bg-cream text-ink hover:border-[#CFC7B5] hover:bg-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf has-[:focus-visible]:ring-offset-2 ${
                phase.name === "loading" ? "pointer-events-none opacity-60" : ""
              }`}
            >
              Upload video or photo
              <input
                type="file"
                accept="video/*,image/*"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  void check(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="text-xs text-muted">The first check downloads the AI (about 12 MB). After that it starts straight away.</p>
        </div>
      )}

      {phase.name === "camera" && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-ink">
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className="block max-h-[65vh] w-full object-contain"
            />
            <canvas
              ref={liveCanvasRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />

            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    phase.recording ? "animate-pulse bg-red-500" : liveAiReady ? "bg-[#9BE29B]" : "bg-mango"
                  }`}
                />
                {phase.recording
                  ? `Recording 0:${String(phase.elapsedSec).padStart(2, "0")} / 0:${MAX_VIDEO_SECONDS}`
                  : !liveAiReady
                    ? "Loading live AI…"
                    : liveCounts.total === 0
                      ? "Point camera at the mangoes"
                      : liveCounts.diseased > 0
                        ? `Live: ${liveCounts.healthy} healthy · ${liveCounts.diseased} flagged`
                        : `Live: ${liveCounts.healthy} healthy`}
              </span>
            </div>

            <div className="absolute right-3 top-3 flex items-center gap-2">
              {!phase.recording && (
                <button
                  type="button"
                  onClick={() => void openCamera(facingMode === "environment" ? "user" : "environment")}
                  className="rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-ink"
                >
                  Flip camera
                </button>
              )}
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-ink"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {phase.recording ? (
              <button
                type="button"
                onClick={stopRecordingAndInspect}
                className={`${button} flex-1 bg-red-600 text-white hover:bg-red-700`}
              >
                Stop &amp; inspect video ({MAX_VIDEO_SECONDS - phase.elapsedSec}s left)
              </button>
            ) : (
              <>
                {canRecord && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className={`${button} flex-1 bg-leaf text-white hover:bg-leaf-dark`}
                  >
                    Record video (up to {MAX_VIDEO_SECONDS}s)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void takePhotoAndInspect()}
                  className={`${button} flex-1 bg-mango text-ink hover:bg-mango-dark`}
                >
                  Take photo &amp; inspect
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {phase.name === "checking" && (
        <div className="space-y-3" aria-live="polite">
          <div ref={previewHost} className="mx-auto max-w-md" />
          <div
            role="progressbar"
            aria-label="Checking the mangoes"
            aria-valuenow={Math.round(phase.fraction * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${Math.round(phase.fraction * 100)}%` }} />
          </div>
          <p className="text-sm text-muted">Checking every mango… {Math.round(phase.fraction * 100)}%</p>
        </div>
      )}

      {(phase.name === "checked" || phase.name === "saving") && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink">This is what the customer will see. Save it, or check again.</p>
          <AiResultView
            data={{ ...phase.result, mediaUrl: phase.localUrl, mediaPath: "", summary: summarize(phase.result.items), checkedAt: "" }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={phase.name === "saving" || phase.result.items.length === 0}
              className={`${button} flex-1 bg-mango text-ink hover:bg-mango-dark`}
            >
              {phase.name !== "saving"
                ? "Save result"
                : phase.uploaded < 1
                  ? `Uploading… ${Math.round(phase.uploaded * 100)}%`
                  : "Preparing the video and saving…"}
            </button>
            <button
              type="button"
              onClick={() => setPhase({ name: "idle" })}
              disabled={phase.name === "saving"}
              className={`${button} border border-line bg-white text-ink hover:bg-cream`}
            >
              Check again
            </button>
          </div>
          {phase.result.items.length === 0 && (
            <p className="text-sm font-semibold text-red-700">No mangoes were found. Record closer, in good light, and try again.</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}