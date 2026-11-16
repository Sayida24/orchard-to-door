import type { OrderStatus } from "@prisma/client";

/** How each order step looks to the customer (list and order page). */
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  PLACED: { label: "Waiting for seller", tone: "bg-mango-soft text-mango-ink" },
  APPROVED: { label: "Approved", tone: "bg-leaf-soft text-leaf" },
  PACKED: { label: "Packed", tone: "bg-sky-100 text-sky-900" },
  DISPATCHED: { label: "On the way", tone: "bg-indigo-100 text-indigo-900" },
  DELIVERED: { label: "Delivered", tone: "bg-green-100 text-green-900" },
  CANCELLED: { label: "Cancelled", tone: "bg-stone-200 text-stone-800" },
};
