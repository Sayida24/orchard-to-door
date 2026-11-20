"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus, Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/form";
import { cancelOrder as cancelHeldOrder } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { CANCEL_REASONS, CONFIRM_FALLBACK_DAYS, DAY_MS, orderNumber, taka } from "@/lib/shop";

function revalidateOrder(orderId: string) {
  revalidatePath("/seller");
  revalidatePath("/seller/orders");
  revalidatePath("/seller/batches");
  revalidatePath("/seller/qr");
  revalidatePath(`/seller/qr/${orderId}`);
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

// FR-08: the seller approves a new order within 24 hours. Its kg were already held
// when the customer ordered, so approving confirms the sale.
export async function approveOrder(fd: FormData) {
  await advance(
    fd,
    "PLACED",
    { status: "APPROVED", approvedAt: new Date() },
    (n) => `The seller approved your order #${n}. They'll pack it soon.`,
  );
}

export async function packOrder(fd: FormData) {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "orderId");
  const where: Prisma.OrderWhereInput = { id, status: "APPROVED", batch: { sellerId: user.id } };
  const order = await prisma.order.findFirst({ where, select: { customerId: true, totalPrice: true } });
  if (!order) return;

  const now = new Date();
  const moved = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({ where, data: { status: "PACKED", packedAt: now } });
    if (updated.count === 0) return false;
    await tx.box.updateMany({ where: { orderId: id, packedAt: null }, data: { packedAt: now } });
    await tx.notification.create({
      data: {
        userId: order.customerId,
        message: `Your order #${orderNumber(id)} is packed. It will be on its way soon.`,
        link: `/customer/orders/${id}`,
      },
    });
    return true;
  });
  if (moved) revalidateOrder(id);
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

// Decline a new order, or cancel an approved one before packing. The customer is told
// why; unless the mangoes are gone or not good enough, the held kg go back on sale.
export async function cancelOrder(fd: FormData) {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "orderId");
  const choice = CANCEL_REASONS.find((c) => c.reason === str(fd, "reason"));
  if (!choice) return;

  const batch = await cancelHeldOrder({
    orderId: id,
    from: ["PLACED", "APPROVED"],
    reason: choice.reason,
    restock: choice.restock,
    by: "seller",
    where: { batch: { sellerId: user.id } },
  });
  if (!batch) return;
  revalidateOrder(id);
  revalidatePath(`/seller/batches/${batch.id}`);
  revalidatePath("/customer");
  revalidatePath(`/customer/orchards/${batch.orchardId}`);
}
