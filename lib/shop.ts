import type { Prisma } from "@prisma/client";

// Shared rules and formatting for the customer shop.

export const GIFT_BOX_FEE = 120; // taka, added once per order
export const DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Bangladesh is UTC+6 all year

/** A batch customers can order from: open, stock left, not past its closing date (FR-08). */
export function openBatchWhere(now: Date): Prisma.BatchWhereInput {
  return {
    status: "OPEN",
    availableKg: { gt: 0 },
    OR: [{ closesAt: null }, { closesAt: { gt: now } }],
  };
}

/** Midnight in Dhaka for the given moment, as a Date. */
export function dhakaDayStart(d: Date) {
  return new Date(Math.floor((d.getTime() + DHAKA_OFFSET_MS) / DAY_MS) * DAY_MS - DHAKA_OFFSET_MS);
}

/** "today", "yesterday", "3 days ago" — counted in Dhaka days. */
export function dayLabel(date: Date, now: Date) {
  const days = Math.round((dhakaDayStart(now).getTime() - dhakaDayStart(date).getTime()) / DAY_MS);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

export const timeLabel = (d: Date) =>
  d.toLocaleTimeString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" });

export const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short" });

/** Delivery times offered at checkout; the server re-checks the choice against this list. */
export function deliverySlots(now: Date) {
  const tomorrow = new Date(dhakaDayStart(now).getTime() + DAY_MS);
  const dayAfter = new Date(tomorrow.getTime() + DAY_MS);
  return [
    `${dateLabel(tomorrow)} · 9 AM – 12 PM`,
    `${dateLabel(tomorrow)} · 3 PM – 6 PM`,
    `${dateLabel(dayAfter)} · 9 AM – 12 PM`,
  ];
}

export const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

/** Rough count shown to customers: about 2–2.4 mangoes per kg. */
export const mangoEstimate = (kg: number) => `${kg * 2}–${Math.round(kg * 2.4)}`;

export function durationLabel(sec: number | null) {
  if (!sec) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const orderNumber = (id: string) => id.slice(-6).toUpperCase();

/** Choices on the "Report a problem" form (FR-21). */
export const COMPLAINT_REASONS = [
  "Damaged or bruised",
  "Spots or disease",
  "Less than I ordered",
  "Wrong variety",
  "Late delivery",
  "Something else",
];
