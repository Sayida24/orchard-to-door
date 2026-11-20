"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AiResultView } from "@/components/ai-result";
import { type AiResult, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, summarize } from "@/lib/inspection";
import { inspectPhoto, inspectVideo, loadModel, type Progress } from "@/lib/yolo-browser";
import { prepareUpload, saveInspection } from "../actions";

type Phase =
  | { name: "idle" }
  | { name: "loading" }
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

const button =
  "inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-base font-bold disabled:cursor-not-allowed disabled:opacity-60";

// The seller's AI check of a packed box. The model runs in this browser; only the
// video (or photo) and the result are sent: the file straight to Storage, the result to us.
export function Inspector({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const previewHost = useRef<HTMLDivElement>(null);
  const localUrl = "localUrl" in phase ? phase.localUrl : null;

  useEffect(() => () => void (localUrl && URL.revokeObjectURL(localUrl)), [localUrl]);

  async function check(file: File | undefined) {
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
            Open the box and record a slow video (up to {MAX_VIDEO_SECONDS} seconds) moving over all the mangoes, in good
            light. A photo works too.
          </p>
          <label
            className={`${button} w-full cursor-pointer bg-leaf text-white hover:bg-leaf-dark has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf has-[:focus-visible]:ring-offset-2 ${
              phase.name === "loading" ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {phase.name === "loading" ? "Getting the AI ready…" : "Choose or record a video or photo"}
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
          <p className="text-xs text-muted">The first check downloads the AI (about 12 MB). After that it starts straight away.</p>
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
