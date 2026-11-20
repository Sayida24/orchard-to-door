"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  CloudinaryNotReady,
  deleteMedia,
  mediaExists,
  mediaUrl,
  publicIdFromVideoUrl,
  uploadPass,
  videoPosterUrl,
} from "@/lib/cloudinary";
import { MAX_VIDEO_BYTES } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";
import { ORCHARD_VIDEO_MAX_DAYS, videoCutoffDate } from "@/lib/shop";

const folderFor = (orchardId: string) => `orchiva/orchards/${orchardId}`;

export type OrchardVideoUploadPass =
  | { ok: true; url: string; fields: Record<string, string> }
  | { ok: false; error: string };

async function countOverdueVideos(sellerId: string) {
  return prisma.harvestVideo.count({
    where: {
      orchard: { sellerId },
      recordedAt: { lt: videoCutoffDate(new Date()) },
    },
  });
}

function revalidateMediaPaths(orchardIds: string[]) {
  revalidatePath("/seller/media");
  revalidatePath("/seller");
  revalidatePath("/customer");
  for (const id of new Set(orchardIds)) {
    revalidatePath(`/seller/orchards/${id}`);
    revalidatePath(`/customer/orchards/${id}`);
  }
}

export async function prepareOrchardVideoUpload(
  orchardId: string,
  size: number,
): Promise<OrchardVideoUploadPass> {
  const user = await requireUser(["SELLER"]);
  const orchard = await prisma.orchard.findFirst({
    where: { id: orchardId, sellerId: user.id },
    select: { id: true },
  });
  if (!orchard) return { ok: false, error: "Choose one of your orchards." };

  const overdue = await countOverdueVideos(user.id);
  if (overdue > 0) {
    return {
      ok: false,
      error: `Remove ${overdue === 1 ? "the video" : `all ${overdue} videos`} older than ${ORCHARD_VIDEO_MAX_DAYS} days before uploading a new one.`,
    };
  }

  if (!(size > 0 && size <= MAX_VIDEO_BYTES)) {
    return { ok: false, error: "The video must be under 100 MB." };
  }

  try {
    return { ok: true, ...uploadPass(folderFor(orchardId), "video") };
  } catch (e) {
    if (e instanceof CloudinaryNotReady) return { ok: false, error: e.message };
    throw e;
  }
}

export type SaveOrchardVideoInput = {
  orchardId: string;
  publicId: string;
  title: string;
  batchId?: string | null;
  durationSec?: number | null;
  sizeBytes?: number | null;
};

export type SaveOrchardVideoState = { ok: true } | { ok: false; error: string };

export async function saveOrchardVideo(input: SaveOrchardVideoInput): Promise<SaveOrchardVideoState> {
  const user = await requireUser(["SELLER"]);
  const orchard = await prisma.orchard.findFirst({
    where: { id: input.orchardId, sellerId: user.id },
    select: { id: true },
  });
  if (!orchard) return { ok: false, error: "Choose one of your orchards." };

  const overdue = await countOverdueVideos(user.id);
  if (overdue > 0) {
    return {
      ok: false,
      error: `Remove videos older than ${ORCHARD_VIDEO_MAX_DAYS} days before adding a new one.`,
    };
  }

  if (!input.publicId.startsWith(`${folderFor(orchard.id)}/`) || input.publicId.includes("..")) {
    return { ok: false, error: "That upload doesn't belong to this orchard." };
  }

  let batchId: string | null = null;
  if (input.batchId) {
    const batch = await prisma.batch.findFirst({
      where: { id: input.batchId, orchardId: orchard.id, sellerId: user.id },
      select: { id: true },
    });
    if (!batch) return { ok: false, error: "Selected harvest batch doesn't belong to this orchard." };
    batchId = batch.id;
  }

  try {
    if (!(await mediaExists(input.publicId, "video"))) {
      return { ok: false, error: "The upload didn't finish. Please try again." };
    }
  } catch (e) {
    if (e instanceof CloudinaryNotReady) return { ok: false, error: e.message };
    throw e;
  }

  const title = input.title.trim().slice(0, 80) || "Orchard harvest video";
  const durationSec =
    typeof input.durationSec === "number" && Number.isFinite(input.durationSec) && input.durationSec > 0
      ? Math.min(3600, Math.round(input.durationSec))
      : null;
  const sizeBytes =
    typeof input.sizeBytes === "number" && Number.isFinite(input.sizeBytes) && input.sizeBytes > 0
      ? Math.min(MAX_VIDEO_BYTES, Math.round(input.sizeBytes))
      : null;

  await prisma.harvestVideo.create({
    data: {
      orchardId: orchard.id,
      batchId,
      url: mediaUrl(input.publicId, "video"),
      posterUrl: videoPosterUrl(input.publicId),
      title,
      durationSec,
      sizeBytes,
    },
  });

  revalidateMediaPaths([orchard.id]);
  return { ok: true };
}

export async function deleteOrchardVideo(formData: FormData) {
  const user = await requireUser(["SELLER"]);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const video = await prisma.harvestVideo.findFirst({
    where: { id, orchard: { sellerId: user.id } },
    select: { id: true, url: true, orchardId: true },
  });
  if (!video) return;

  await prisma.harvestVideo.delete({ where: { id: video.id } });
  const publicId = publicIdFromVideoUrl(video.url);
  if (publicId) {
    await deleteMedia(publicId, "video").catch(() => {});
  }

  revalidateMediaPaths([video.orchardId]);
}

export async function deleteOverdueVideos() {
  const user = await requireUser(["SELLER"]);
  const overdue = await prisma.harvestVideo.findMany({
    where: {
      orchard: { sellerId: user.id },
      recordedAt: { lt: videoCutoffDate(new Date()) },
    },
    select: { id: true, url: true, orchardId: true },
  });
  if (overdue.length === 0) return;

  await Promise.allSettled(
    overdue.map((v) => {
      const publicId = publicIdFromVideoUrl(v.url);
      return publicId ? deleteMedia(publicId, "video") : Promise.resolve();
    }),
  );

  await prisma.harvestVideo.deleteMany({
    where: { id: { in: overdue.map((v) => v.id) } },
  });

  revalidateMediaPaths(overdue.map((v) => v.orchardId));
}