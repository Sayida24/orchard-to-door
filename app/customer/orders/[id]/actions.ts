"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { cancelOrder, CUSTOMER_CANCELLED } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { COMPLAINT_REASONS, MAX_REPORT_PHOTOS, orderNumber } from "@/lib/shop";
import { deletePhoto, photoProblem, savePhotoFromForm } from "@/lib/storage";

export type FeedbackState = { ok?: boolean; error?: string } | undefined;

async function ownOrder(orderId: string) {
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { batch: { select: { orchardId: true, sellerId: true, variety: { select: { name: true } } } } },
  });
  return order && order.customerId === user.id ? { user, order } : null;
}

// FR-21: report a problem with an order, with up to two photos. The seller decides on a
// refund, a new box or no; the admin can see every report.
export async function reportProblem(_prev: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const orderId = String(fd.get("orderId") ?? "");
  const reason = String(fd.get("reason") ?? "");
  const message = String(fd.get("message") ?? "").trim().slice(0, 1000);
  const photos = fd.getAll("photo").filter((p): p is File => p instanceof File && p.size > 0);

  const found = await ownOrder(orderId);
  if (!found) return { error: "Order not found." };
  const { user, order } = found;
  if (order.status === "CANCELLED") return { error: "This order was cancelled." };
  if (!COMPLAINT_REASONS.includes(reason)) return { error: "Choose what went wrong." };
  if (message.length < 10) return { error: "Tell us a little more (at least 10 characters)." };
  if (photos.length > MAX_REPORT_PHOTOS) return { error: `Add at most ${MAX_REPORT_PHOTOS} photos.` };
  for (const photo of photos) {
    const problem = await photoProblem(photo);
    if (problem) return { error: problem };
  }
  if (await prisma.complaint.count({ where: { orderId, status: "OPEN" } })) {
    return { error: "You already have an open report on this order. The seller will reply to it soon." };
  }

  const photoUrls: string[] = [];
  for (const photo of photos) {
    const saved = await savePhotoFromForm(photo, `reports/${orderId}`);
    if ("error" in saved) {
      await Promise.all(photoUrls.map((url) => deletePhoto(url).catch(() => {})));
      return { error: saved.error };
    }
    photoUrls.push(saved.url);
  }

  try {
    await prisma.$transaction([
      prisma.complaint.create({ data: { orderId, customerId: user.id, reason, message, photoUrls } }),
      prisma.notification.create({
        data: {
          userId: order.batch.sellerId,
          message: `Problem reported on order #${orderNumber(orderId)}: ${reason}. Please decide on it.`,
          link: "/seller/reports",
        },
      }),
    ]);
  } catch (e) {
    await Promise.all(photoUrls.map((url) => deletePhoto(url).catch(() => {})));
    throw e;
  }
  revalidatePath(`/customer/orders/${orderId}`);
  revalidatePath("/seller");
  revalidatePath("/seller/reports");
  revalidatePath("/seller/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/orchards");
  return { ok: true };
}

// While the seller hasn't approved it yet, the customer can cancel; the held kg go back on sale.
export async function cancelMyOrder(_prev: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const user = await requireUser();
  const orderId = String(fd.get("orderId") ?? "");
  const batch = await cancelOrder({
    orderId,
    from: ["PLACED"],
    reason: CUSTOMER_CANCELLED,
    restock: true,
    by: "customer",
    where: { customerId: user.id },
  });
  if (!batch) return { error: "The seller has already approved this order, so it can't be cancelled here." };
  revalidatePath(`/customer/orders/${orderId}`);
  revalidatePath("/customer/orders");
  revalidatePath("/customer");
  revalidatePath(`/customer/orchards/${batch.orchardId}`);
  revalidatePath("/seller/orders");
  return { ok: true };
}

// FR-19: the customer confirms the box arrived (and they paid the cash). Then they can rate it.
export async function confirmDelivery(_prev: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const orderId = String(fd.get("orderId") ?? "");
  const found = await ownOrder(orderId);
  if (!found) return { error: "Order not found." };
  const { user, order } = found;
  if (order.status !== "DISPATCHED") return { error: "This order isn't on its way yet." };

  const confirmed = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "DISPATCHED" },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    if (updated.count === 0) return false;
    await tx.notification.create({
      data: {
        userId: order.batch.sellerId,
        message: `${user.name.split(" ")[0]} got order #${orderNumber(orderId)} (${order.quantityKg} kg ${order.batch.variety.name}).`,
        link: "/seller/orders?show=delivered",
      },
    });
    return true;
  });
  if (!confirmed) return { error: "This order was already updated. Refresh the page." };
  revalidatePath(`/customer/orders/${orderId}`);
  revalidatePath("/customer/orders");
  return { ok: true };
}

// FR-37: one 1–5 star review per delivered order, shown on the orchard's page.
export async function submitReview(_prev: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const orderId = String(fd.get("orderId") ?? "");
  const rating = Number(fd.get("rating"));
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 500);

  const found = await ownOrder(orderId);
  if (!found) return { error: "Order not found." };
  const { user, order } = found;
  if (order.status !== "DELIVERED") return { error: "You can rate your mangoes once they're delivered." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose 1 to 5 stars." };
  if (await prisma.review.count({ where: { orderId } })) return { error: "You've already reviewed this order." };

  await prisma.$transaction([
    prisma.review.create({
      data: { orderId, rating, comment: comment || null, orchardId: order.batch.orchardId, customerId: user.id },
    }),
    prisma.notification.create({
      data: {
        userId: order.batch.sellerId,
        message: `New ${rating}★ review for ${order.batch.variety.name} (order #${orderNumber(orderId)})`,
        link: "/seller/orders?show=delivered",
      },
    }),
  ]);
  revalidatePath(`/customer/orders/${orderId}`);
  return { ok: true };
}
