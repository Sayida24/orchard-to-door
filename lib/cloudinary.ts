import { createHash, randomUUID } from "node:crypto";

// Packing videos and photos for the AI check live on Cloudinary. It also turns any phone's
// video (e.g. an iPhone's HEVC .mov) into an MP4 every browser can play, and compresses it.
// Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env (and on
// Vercel). The secret stays on the server: browsers only get a signed, one-time upload pass.

export class CloudinaryNotReady extends Error {}
export type MediaKind = "video" | "image";

function config() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    throw new CloudinaryNotReady(
      "Video uploads aren't set up yet: add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.",
    );
  }
  return { cloud, key, secret };
}

/** Cloudinary's request signature: the parameters sorted by name, then the secret, SHA-1. */
function sign(params: Record<string, string>, secret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

const now = () => String(Math.floor(Date.now() / 1000));

// Customers watch a compressed MP4 copy made at upload. Only the format and quality change,
// never the size or timing, so the AI boxes drawn over the video still line up.
const VIDEO_COPY = "q_auto";

/** A signed pass for one upload into `folder`; the browser posts the file with these fields. */
export function uploadPass(folder: string, kind: MediaKind) {
  const { cloud, key, secret } = config();
  const params: Record<string, string> = {
    public_id: `${folder}/${randomUUID()}`,
    // The folder in the path above is just part of the file's name. On accounts with dynamic
    // folders (all new ones) this also files it under that folder in the Media Library.
    asset_folder: folder,
    timestamp: now(),
  };
  if (kind === "video") params.eager = `${VIDEO_COPY}/mp4`;
  return {
    url: `https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`,
    fields: { ...params, api_key: key, signature: sign(params, secret) },
  };
}

/** The address customers load: an MP4 for videos, a compressed image for photos. */
export function mediaUrl(publicId: string, kind: MediaKind) {
  const { cloud } = config();
  return kind === "video"
    ? `https://res.cloudinary.com/${cloud}/video/upload/${VIDEO_COPY}/${publicId}.mp4`
    : `https://res.cloudinary.com/${cloud}/image/upload/q_auto,f_auto/${publicId}`;
}

/** Whether a file was really uploaded under this ID. */
export async function mediaExists(publicId: string, kind: MediaKind) {
  const { cloud, key, secret } = config();
  const path = publicId.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${kind}/upload/${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
    cache: "no-store",
  });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Cloudinary lookup failed (${res.status})`);
  return true;
}

/** Thumbnail frame for an uploaded video (first frame, compressed JPEG). */
export function videoPosterUrl(publicId: string) {
  const { cloud } = config();
  return `https://res.cloudinary.com/${cloud}/video/upload/so_0,q_auto,f_jpg/${publicId}.jpg`;
}

/** Extracts the Cloudinary publicId from a video URL stored by mediaUrl(), or null for external/sample files. */
export function publicIdFromVideoUrl(url: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return null;
  const marker = `https://res.cloudinary.com/${cloud}/video/upload/`;
  if (!url.startsWith(marker)) return null;
  const rest = url.slice(marker.length);
  const parts = rest.split("/");
  if (parts.length < 2) return null;
  // Drop the transformation segment (e.g. "q_auto") and file extension (e.g. ".mp4")
  const joined = parts.slice(1).join("/");
  return joined.replace(/\.[^./]+$/, "") || null;
}

export async function deleteMedia(publicId: string, kind: MediaKind) {
  const { cloud, key, secret } = config();
  const params = { invalidate: "true", public_id: publicId, timestamp: now() };
  await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${kind}/destroy`, {
    method: "POST",
    body: new URLSearchParams({ ...params, api_key: key, signature: sign(params, secret) }),
  });
}