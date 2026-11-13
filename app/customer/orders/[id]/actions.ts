"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPLAINT_REASONS, orderNumber } from "@/lib/shop";

export type FeedbackState = { ok?: boolean; error?: string } | undefined;

async function ownOrder(orderId: string) {
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { batch: { select: { orchardId: true, sellerId: true, variety: { select: { name: true } } } } },
  });
  return order && order.customerId === user.id ? { user, order } : null;
}

// FR-21: report a problem with an order; an admin reviews it (refund or replacement).
export async function reportProblem(_prev: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const orderId = String(fd.get("orderId") ?? "");
  const reason = String(fd.get("reason") ?? "");
  const message = String(fd.get("message") ?? "").trim().slice(0, 1000);

  const found = await ownOrder(orderId);
  if (!found) return { error: "Order not found." };
  const { user, order } = found;
  if (order.status === "CANCELLED") return { error: "This order was cancelled." };
  if (!COMPLAINT_REASONS.includes(reason)) return { error: "Choose what went wrong." };
  if (message.length < 10) return { error: "Tell us a little more (at least 10 characters)." };
  if (await prisma.complaint.count({ where: { orderId, status: "OPEN" } })) {
    return { error: "You already have an open report on this order. We'll reply to it soon." };
  }

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await prisma.$transaction([
    prisma.complaint.create({ data: { orderId, customerId: user.id, reason, message, photoUrls: [] } }),
    prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        message: `Problem reported on order #${orderNumber(orderId)}: ${reason}`,
        link: "/admin",
      })),
    }),
  ]);
  revalidatePath(`/customer/orders/${orderId}`);
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
        link: "/seller",
      },
    }),
  ]);
  revalidatePath(`/customer/orders/${orderId}`);
  return { ok: true };
}
