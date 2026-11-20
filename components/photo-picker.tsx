"use client";

/* eslint-disable @next/next/no-img-element -- previews are local blob: URLs or storage URLs */
import { useEffect, useState } from "react";

const MAX_SIDE = 1600; // px; plenty for a full-width cover on a phone or laptop

/** Shrinks a photo in the browser to a JPEG of at most `maxSide` px, usually a few hundred KB. */
export async function shrinkPhoto(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // also applies the phone's rotation
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const jpeg = (quality: number) =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the photo"))), "image/jpeg", quality),
    );
  const blob = await jpeg(0.82);
  return blob.size > 900 * 1024 ? jpeg(0.6) : blob; // a very detailed photo: squeeze it a bit more
}

const size = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

/**
 * Pick a photo, see it, and hand a shrunk JPEG to the parent form. The file input itself
 * has no name, so the big original is never uploaded; the form adds `photo` from `onChange`.
 */
export function PhotoPicker({
  id,
  label,
  hint,
  currentUrl,
  required,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  currentUrl?: string;
  required?: boolean;
  onChange: (photo: Blob | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNote({ text: "That isn't a photo. Choose a JPG or PNG.", error: true });
      return;
    }
    setBusy(true);
    try {
      const small = await shrinkPhoto(file);
      setPreview(URL.createObjectURL(small));
      setNote({ text: `Ready: ${size(file.size)} photo shrunk to ${size(small.size)}.` });
      onChange(small);
    } catch {
      setPreview(null);
      setNote({ text: "This photo couldn't be read. Try a JPG or PNG.", error: true });
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? currentUrl;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
        {shown ? (
          <img src={shown} alt="Orchard photo preview" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-stone-500">No photo yet</div>
        )}
      </div>
      <input
        id={id}
        type="file"
        accept="image/*"
        required={required && !preview}
        disabled={busy}
        onChange={(e) => pick(e.target.files?.[0])}
        className="block w-full text-sm text-stone-700 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-stone-900 file:px-4 file:font-semibold file:text-white hover:file:bg-stone-800"
      />
      <p aria-live="polite" className={`text-xs ${note?.error ? "font-semibold text-red-700" : "text-stone-500"}`}>
        {busy ? "Preparing the photo…" : (note?.text ?? hint)}
      </p>
    </div>
  );
}
