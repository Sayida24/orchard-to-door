"use server";

import { makeBoxQrCode } from "@/lib/qr";
import type { AiStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { CloudinaryNotReady, deleteMedia, mediaExists, mediaUrl, type MediaKind, uploadPass } from "@/lib/cloudinary";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, parseAiResult, parseStoredAi, summarize, type StoredAi } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";

const folderFor = (orderId: string) => `orchiva/orders/${orderId}`;
const isKind = (k: unknown): k is MediaKind => k === "video" || k === "image";

/** The seller's order, if it can still be checked (approved, or packed but not yet sent). */
async function checkableOrder(orderId: string) {
  const user = await requireUser(["SELLER"]);
  return prisma.order.findFirst({
    where: { id: orderId, batch: { sellerId: user.id }, status: { in: ["APPROVED", "PACKED"] } },
    select: { id: true },
  });
}

export type UploadPass = { ok: true; url: string; fields: Record<string, string> } | { ok: false; error: string };

// Step 1: a signed, one-time pass so the browser can upload the file straight to Cloudinary
// (our server only accepts 4.5 MB per request). The pass fixes the file's name and folder.
export async function prepareUpload(orderId: string, kind: MediaKind, size: number): Promise<UploadPass> {
  if (!(await checkableOrder(orderId))) return { ok: false, error: "This order can't be checked any more." };
  if (!isKind(kind)) return { ok: false, error: "Choose a video or a photo." };
  const max = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!(size > 0 && size <= max)) {
    return { ok: false, error: kind === "video" ? "The video must be under 100 MB." : "The photo must be under 10 MB." };
  }
  try {
    return { ok: true, ...uploadPass(folderFor(orderId), kind) };
  } catch (e) {
    if (e instanceof CloudinaryNotReady) return { ok: false, error: e.message };
    throw e;
  }
}

export type SaveState = { ok: true; qrCode: string } | { ok: false; error: string };

// Step 2: store the result on the order's box (FR-14/15). The browser's numbers are
// checked and the summary is worked out again here; a disease is only a warning.
export async function saveInspection(orderId: string, kind: MediaKind, publicId: string, raw: unknown): Promise<SaveState> {
  if (!(await checkableOrder(orderId))) return { ok: false, error: "This order can't be checked any more." };
  if (!isKind(kind) || !publicId.startsWith(`${folderFor(orderId)}/`) || publicId.includes("..")) {
    return { ok: false, error: "That upload doesn't belong to this order." };
  }
  const result = parseAiResult(raw);
  if (!result || (result.kind === "video") !== (kind === "video")) {
    return { ok: false, error: "The check result looks wrong. Please check again." };
  }
  const summary = summarize(result.items);
  if (summary.total === 0) return { ok: false, error: "No mangoes were found. Record closer, in good light, and try again." };
  try {
    if (!(await mediaExists(publicId, kind))) return { ok: false, error: "The upload didn't finish. Please try again." };
  } catch (e) {
    if (e instanceof CloudinaryNotReady) return { ok: false, error: e.message };
    throw e;
  }

  const now = new Date();
  const stored: StoredAi = {
    ...result,
    mediaUrl: mediaUrl(publicId, kind),
    mediaPath: `${kind}:${publicId}`, // what to delete if the box is checked again
    summary,
    checkedAt: now.toISOString(),
  };
  const data = {
    photoUrls: [stored.mediaUrl],
    annotatedPhotoUrls: [] as string[],
    aiStatus: (summary.diseased ? "DEFECT_FOUND" : "CLEAN") as AiStatus,
    aiHealthyCount: summary.healthy,
    aiDefectCount: summary.diseased,
    aiDetections: stored as unknown as Prisma.InputJsonValue,
    aiCheckedAt: now,
  };

  const existing = await prisma.box.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      select: { id: true, qrCode: true, aiDetections: true },
    });
    let qrCode: string;
    if (existing) {
      qrCode = existing.qrCode;
      await prisma.box.update({ where: { id: existing.id }, data });
      // A new check replaces the old one: its file isn't needed any more.
      const old = parseStoredAi(existing.aiDetections)?.mediaPath;
      const [oldKind, ...rest] = old?.split(":") ?? [];
      const oldId = rest.join(":");
      if (oldId && oldId !== publicId && isKind(oldKind)) await deleteMedia(oldId, oldKind).catch(() => {});
    } else {
      qrCode = makeBoxQrCode(orderId);
      await prisma.box.create({ data: { ...data, qrCode, orderId } });
    }

    revalidatePath("/seller/inspection");
    revalidatePath(`/seller/inspection/${orderId}`);
    revalidatePath("/seller/qr");
    revalidatePath(`/seller/qr/${orderId}`);
    revalidatePath("/seller/orders");
    revalidatePath(`/customer/orders/${orderId}`);
    revalidatePath("/admin/reports");
    return { ok: true, qrCode };
}