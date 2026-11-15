import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orderNumber } from "@/lib/shop";

// FR-08: a new order holds its kg straight away (so nobody can buy mangoes that are
// already taken), and the seller approves it within 24 hours. If the order is declined,
// cancelled or not approved in time, the held kg go back on sale.

export const APPROVAL_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

/** Saved as the cancel reason, so pages can say who cancelled. */
export const CUSTOMER_CANCELLED = "Cancelled by the customer";
export const NOT_APPROVED_IN_TIME = `Not approved within ${APPROVAL_HOURS} hours`;

/** Hours left before a waiting order is cancelled automatically (0 when due). */
export function approvalHoursLeft(createdAt: Date, now: Date) {
  return Math.max(0, Math.ceil(APPROVAL_HOURS - (now.getTime() - createdAt.getTime()) / HOUR_MS));
}

type CancelledBy = "seller" | "customer" | "system";

/**
 * Cancels an order that's still in one of the `from` steps, in one transaction: the status
 * changes only if nobody moved the order meanwhile, the held kg go back on sale (unless
 * `restock` is false, e.g. the mangoes are gone), and the other side is told.
 * Returns the batch, or null when the order had already moved on.
 */
export async function cancelOrder(opts: {
  orderId: string;
  from: OrderStatus[];
  reason: string;
  restock: boolean;
  by: CancelledBy;
  where?: Prisma.OrderWhereInput; // e.g. only this seller's or this customer's order
}) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { ...opts.where, id: opts.orderId, status: { in: opts.from } },
      select: {
        status: true,
        customerId: true,
        quantityKg: true,
        batch: { select: { id: true, orchardId: true, sellerId: true, status: true, closesAt: true } },
      },
    });
    if (!order) return null;
    const updated = await tx.order.updateMany({
      where: { id: opts.orderId, status: order.status },
      data: { status: "CANCELLED", cancelledAt: now, cancelReason: opts.reason },
    });
    if (updated.count === 0) return null;

    const b = order.batch;
    if (opts.restock) {
      // A sold-out batch reopens, unless its selling time is over.
      const reopen = b.status === "SOLD_OUT" && (b.closesAt === null || b.closesAt > now);
      await tx.batch.update({
        where: { id: b.id },
        data: { availableKg: { increment: order.quantityKg }, ...(reopen ? { status: "OPEN" as const } : {}) },
      });
    }

    const num = orderNumber(opts.orderId);
    const why = opts.reason.toLowerCase();
    const toCustomer = { userId: order.customerId, link: `/customer/orders/${opts.orderId}` };
    const toSeller = { userId: b.sellerId, link: "/seller/orders?show=cancelled" };
    const notes =
      opts.by === "seller"
        ? [
            {
              ...toCustomer,
              message:
                order.status === "PLACED"
                  ? `Sorry, the seller couldn't take order #${num} (${why}). You won't be charged.`
                  : `Sorry, the seller cancelled order #${num} (${why}). You won't be charged.`,
            },
          ]
        : opts.by === "customer"
          ? [{ ...toSeller, message: `The customer cancelled order #${num} before you approved it.` }]
          : [
              {
                ...toCustomer,
                message: `Order #${num} was cancelled: the seller didn't approve it within ${APPROVAL_HOURS} hours. You won't be charged.`,
              },
              { ...toSeller, message: `Order #${num} was cancelled automatically: it wasn't approved within ${APPROVAL_HOURS} hours.` },
            ];
    await tx.notification.createMany({ data: notes });
    return b;
  });
}

/**
 * Cancels orders that have waited more than 24 hours for approval. Called when order and
 * shop pages load, so it happens without a background job. Safe to call often: each
 * order can only be cancelled once.
 */
export async function expireUnapprovedOrders() {
  const cutoff = new Date(Date.now() - APPROVAL_HOURS * HOUR_MS);
  const due = await prisma.order.findMany({
    where: { status: "PLACED", createdAt: { lt: cutoff } },
    select: { id: true },
    take: 20,
  });
  for (const { id } of due) {
    await cancelOrder({ orderId: id, from: ["PLACED"], reason: NOT_APPROVED_IN_TIME, restock: true, by: "system" });
  }
}
