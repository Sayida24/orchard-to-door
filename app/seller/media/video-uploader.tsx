"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MAX_VIDEO_BYTES } from "@/lib/inspection";
import { ORCHARD_VIDEO_MAX_DAYS } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { prepareOrchardVideoUpload, saveOrchardVideo } from "./actions";

export type OrchardOption = {
  id: string;
  name: string;
  batches: { id: string; label: string }[];
};

function uploadToCloudinary(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (p: number) => void,
) {
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
      resolve(detail ? `Upload failed: ${detail}` : "The video upload failed. Please try again.");
    };
    xhr.onerror = () => resolve("Upload failed. Check your internet connection and try again.");
    xhr.send(body);
  });
}

function readDurationSec(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (sec: number | null) => {
      URL.revokeObjectURL(url);
      resolve(sec);
    };
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : null;
      done(d);
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OrchardVideoUploader({
  orchards,
  initialOrchardId,
  overdueCount,
}: {
  orchards: OrchardOption[];
  initialOrchardId?: string;
  overdueCount: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultOrchard =
    orchards.find((o) => o.id === initialOrchardId)?.id ?? orchards[0]?.id ?? "";

  const [orchardId, setOrchardId] = useState(defaultOrchard);
  const [batchId, setBatchId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const currentOrchard = orchards.find((o) => o.id === orchardId) ?? orchards[0];
  const batches = currentOrchard?.batches ?? [];
  const blockedByOverdue = overdueCount > 0;

  async function onPickFile(picked: File | undefined) {
    setError(null);
    setSavedMsg(false);
    if (!picked) {
      setFile(null);
      setPreviewUrl(null);
      setDurationSec(null);
      return;
    }
    if (!picked.type.startsWith("video/")) {
      setError("Please choose a video file (MP4, MOV, or WebM).");
      return;
    }
    if (picked.size > MAX_VIDEO_BYTES) {
      setError("That video is larger than 100 MB. Record a shorter clip and try again.");
      return;
    }
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    const sec = await readDurationSec(picked);
    setDurationSec(sec);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blockedByOverdue) {
      setError(`Remove videos older than ${ORCHARD_VIDEO_MAX_DAYS} days before uploading a new one.`);
      return;
    }
    if (!orchardId) {
      setError("Choose an orchard.");
      return;
    }
    if (!file) {
      setError("Choose a video of your orchard to upload.");
      return;
    }

    setError(null);
    setSavedMsg(false);
    setUploading(true);
    setProgress(0);

    try {
      const pass = await prepareOrchardVideoUpload(orchardId, file.size);
      if (!pass.ok) {
        setError(pass.error);
        setUploading(false);
        return;
      }

      const failed = await uploadToCloudinary(pass.url, pass.fields, file, setProgress);
      if (failed) {
        setError(failed);
        setUploading(false);
        return;
      }

      const saved = await saveOrchardVideo({
        orchardId,
        publicId: pass.fields.public_id,
        title: title.trim() || "Orchard harvest video",
        batchId: batchId || null,
        durationSec,
        sizeBytes: file.size,
      });

      if (!saved.ok) {
        setError(saved.error);
        setUploading(false);
        return;
      }

      setTitle("");
      setBatchId("");
      setFile(null);
      setPreviewUrl(null);
      setDurationSec(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploading(false);
      setProgress(0);
      setSavedMsg(true);
      router.refresh();
    } catch {
      setError("Could not upload the video. Please try again.");
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${ui.card} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Upload an orchard video</h2>
          <p className="text-sm text-stone-600">
            Show customers fresh picking or trees in your orchard. Videos stay visible for up to{" "}
            <strong>{ORCHARD_VIDEO_MAX_DAYS} days</strong> and must be removed within {ORCHARD_VIDEO_MAX_DAYS} days.
          </p>
        </div>
      </div>

      {savedMsg && (
        <p role="status" className="rounded-xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-leaf">
          Video uploaded. Remember to remove it within {ORCHARD_VIDEO_MAX_DAYS} days.
        </p>
      )}

      {blockedByOverdue && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
          Uploads are paused until you remove {overdueCount === 1 ? "the video" : `all ${overdueCount} videos`} past the{" "}
          {ORCHARD_VIDEO_MAX_DAYS}-day removal deadline below.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="orchardId" className={ui.label}>
            Orchard
          </label>
          <select
            id="orchardId"
            value={orchardId}
            disabled={uploading || blockedByOverdue}
            onChange={(e) => {
              setOrchardId(e.target.value);
              setBatchId("");
            }}
            className={ui.input}
          >
            {orchards.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="batchId" className={ui.label}>
            Harvest batch <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <select
            id="batchId"
            value={batchId}
            disabled={uploading || blockedByOverdue || batches.length === 0}
            onChange={(e) => setBatchId(e.target.value)}
            className={ui.input}
          >
            <option value="">General orchard video</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="video-title" className={ui.label}>
          Video title
        </label>
        <input
          id="video-title"
          type="text"
          maxLength={80}
          value={title}
          disabled={uploading || blockedByOverdue}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Morning Himsagar picking"
          className={ui.input}
        />
      </div>

      <div>
        <label htmlFor="orchard-video-file" className={ui.label}>
          Video file <span className="font-normal text-stone-500">(MP4, MOV, or WebM · max 100 MB)</span>
        </label>
        <input
          ref={fileInputRef}
          id="orchard-video-file"
          type="file"
          accept="video/*"
          disabled={uploading || blockedByOverdue}
          onChange={(e) => void onPickFile(e.target.files?.[0])}
          className="mt-1 block w-full rounded-xl border border-dashed border-[#DCD4C3] bg-stone-50 px-3 py-3 text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-mango file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink hover:file:bg-mango-dark disabled:opacity-50"
        />
      </div>

      {previewUrl && file && (
        <div className="space-y-2 rounded-2xl border border-line bg-stone-50 p-3">
          <video src={previewUrl} controls playsInline className="aspect-video w-full rounded-xl bg-black object-cover" />
          <p className="text-xs text-stone-600">
            {file.name} · {formatMb(file.size)}
            {durationSec ? ` · ${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}` : ""}
          </p>
        </div>
      )}

      {uploading && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex justify-between text-xs font-semibold text-stone-700">
            <span>Uploading video…</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-leaf transition-all"
              style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          3-day rule: every uploaded video must be deleted within {ORCHARD_VIDEO_MAX_DAYS} days.
        </p>
        <button type="submit" disabled={uploading || blockedByOverdue || !file} className={ui.button}>
          {uploading ? "Uploading…" : "Upload orchard video"}
        </button>
      </div>
    </form>
  );
}