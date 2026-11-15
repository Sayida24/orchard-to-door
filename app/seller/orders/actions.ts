"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus, Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { CANCEL_REASONS, CONFIRM_FALLBACK_DAYS, DAY_MS, orderNumber, taka } from "@/lib/shop";

function revalidateOrder(orderId: string) {
  revalidatePath("/seller");
  revalidatePath("/seller/orders");
  revalidatePath("/customer/orders");
  revalidatePath(`/customer/orders/${orderId}`);
}

// Moves one of the seller's orders to the next step and tells the customer (FR-19).
// The status is part of the update's filter, so a double click can't skip a step.
async function advance(
  fd: FormData,
  from: OrderStatus,
  data: Prisma.OrderUpdateManyMutationInput,
  message: (num: string, total: string) => string,
  extra: Prisma.OrderWhereInput = {},
) {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "orderId");
  const where: Prisma.OrderWhereInput = { ...extra, id, status: from, batch: { sellerId: user.id } };
  const order = await prisma.order.findFirst({ where, select: { customerId: true, totalPrice: true } });
  if (!order) return;

  const moved = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({ where, data });
    if (updated.count === 0) return false;
    await tx.notification.create({
      data: {
        userId: order.customerId,
        message: message(orderNumber(id), taka(order.totalPrice)),
        link: `/customer/orders/${id}`,
      },
    });
    return true;
  });
  if (moved) revalidateOrder(id);
}

export async function packOrder(fd: FormData) {
  await advance(fd, "PLACED", { status: "PACKED", packedAt: new Date() }, (n) => `Your order #${n} is packed. It will be on its way soon.`);
}

export async function dispatchOrder(fd: FormData) {
  await advance(
    fd,
    "PACKED",
    { status: "DISPATCHED", dispatchedAt: new Date() },
    (n, total) => `Your order #${n} is on its way. Pay ${total} in cash when it arrives, then tap "I got my mangoes".`,
  );
}

// The customer confirms delivery. If they haven't after a couple of days, the seller
// (who handed over the box and took the cash) can mark it delivered instead.
export async function markDelivered(fd: FormData) {
  const cutoff = new Date(Date.now() - CONFIRM_FALLBACK_DAYS * DAY_MS);
  await advance(
    fd,
    "DISPATCHED",
    { status: "DELIVERED", deliveredAt: new Date() },
    (n) => `Order #${n} was marked delivered. How were your mangoes? Tap to rate them.`,
    { dispatchedAt: { lte: cutoff } },
  );
}

// Before packing, the seller can cancel. The customer is told why, and unless the
// mangoes are gone or not good enough, the kg go back on sale.
export async function cancelOrder(fd: FormData) {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "orderId");
  const choice = CANCEL_REASONS.find((c) => c.reason === str(fd, "reason"));
  if (!choice) return;
  const now = new Date();

  const batch = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, status: "PLACED", batch: { sellerId: user.id } },
      select: { customerId: true, quantityKg: true, batch: { select: { id: true, orchardId: true, status: true, closesAt: true } } },
    });
    if (!order) return null;
    const updated = await tx.order.updateMany({
      where: { id, status: "PLACED" },
      data: { status: "CANCELLED", cancelledAt: now, cancelReason: choice.reason },
    });
    if (updated.count === 0) return null;

    if (choice.restock) {
      const b = order.batch;
      const reopen = b.status === "SOLD_OUT" && (b.closesAt === null || b.closesAt > now);
      await tx.batch.update({
        where: { id: b.id },
        data: { availableKg: { increment: order.quantityKg }, ...(reopen ? { status: "OPEN" as const } : {}) },
      });
    }
    await tx.notification.create({
      data: {
        userId: order.customerId,
        message: `Sorry, order #${orderNumber(id)} was cancelled by the seller (${choice.reason.toLowerCase()}). You won't be charged.`,
        link: `/customer/orders/${id}`,
      },
    });
    return order.batch;
  });
  if (!batch) return;

  revalidateOrder(id);
  revalidatePath("/seller/batches");
  revalidatePath(`/seller/batches/${batch.id}`);
  revalidatePath("/customer");
  revalidatePath(`/customer/orchards/${batch.orchardId}`);
}

// FR-25: after an admin approves a refund or a new box, the seller does it and ticks it off.
export async function completeReport(fd: FormData) {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "complaintId");
  const report = await prisma.complaint.findFirst({
    where: { id, status: "APPROVED", completedAt: null, order: { batch: { sellerId: user.id } } },
    select: { customerId: true, orderId: true, resolution: true },
  });
  if (!report) return;
  const num = orderNumber(report.orderId);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.complaint.updateMany({ where: { id, completedAt: null }, data: { completedAt: new Date() } });
    if (updated.count === 0) return;
    await tx.notification.create({
      data: {
        userId: report.customerId,
        message:
          report.resolution === "REFUND"
            ? `The seller has returned your money for order #${num}.`
            : `The seller has sent you a new box for order #${num}.`,
        link: `/customer/orders/${report.orderId}`,
      },
    });
  });
  revalidateOrder(report.orderId);
}
