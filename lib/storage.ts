import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Photos live in Supabase Storage (the same Supabase project as the database), in a
// public bucket so customers' browsers can load them directly. Needs SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in .env (and on Vercel). The key never leaves the server.

const BUCKET = "orchard-photos";
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export class StorageNotReady extends Error {}

let client: SupabaseClient | undefined;

function baseUrl() {
  return (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
}

function storage() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl() || !key) {
    throw new StorageNotReady("Photo uploads aren't set up yet: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.");
  }
  client ??= createClient(baseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client.storage;
}

/** Why a file can't be used as a photo, or null. The browser sends JPEGs; anything else is refused. */
export async function photoProblem(file: File) {
  if (file.size > MAX_PHOTO_BYTES) return "That photo is too large. Choose another one.";
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  return isJpeg ? null : "That file isn't a photo we can use. Choose a JPG or PNG photo.";
}

/** Uploads a JPEG under `folder/` and returns its public URL. Creates the bucket the first time. */
export async function uploadPhoto(file: Blob, folder: string) {
  const store = storage();
  const path = `${folder}/${randomUUID()}.jpg`;
  const put = () =>
    store.from(BUCKET).upload(path, file, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });

  let { error } = await put();
  if (error && /bucket not found/i.test(error.message)) {
    const created = await store.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/jpeg"],
      fileSizeLimit: MAX_PHOTO_BYTES,
    });
    if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
    ({ error } = await put());
  }
  if (error) throw error;
  return store.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Deletes a photo this app uploaded. Other URLs (like the sample photos in /images) are left alone. */
export async function deletePhoto(url: string) {
  const prefix = `${baseUrl()}/storage/v1/object/public/${BUCKET}/`;
  if (!baseUrl() || !url.startsWith(prefix)) return;
  await storage().from(BUCKET).remove([decodeURIComponent(url.slice(prefix.length))]);
}

/** Checks and uploads a photo from a form. Returns the URL, or an error to show. */
export async function savePhotoFromForm(photo: File, folder: string): Promise<{ url: string } | { error: string }> {
  const problem = await photoProblem(photo);
  if (problem) return { error: problem };
  try {
    return { url: await uploadPhoto(photo, folder) };
  } catch (e) {
    if (e instanceof StorageNotReady) return { error: e.message };
    console.error("Photo upload failed:", e);
    return { error: "The photo couldn't be uploaded. Please try again." };
  }
}
