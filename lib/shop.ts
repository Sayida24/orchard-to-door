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
    orchard: { isActive: true }, // an admin can pause an orchard: nothing from it is on sale
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

/** Delivery is 2 or 3 days after the order: the seller first has up to 24 hours to approve. */
export const DELIVERY_AFTER_DAYS = [2, 3];

/** The delivery days offered at checkout, e.g. "Wed 18 Nov"; the server re-checks the choice against this list. */
export function deliveryDays(now: Date) {
  const today = dhakaDayStart(now).getTime();
  return DELIVERY_AFTER_DAYS.map((n) => dateLabel(new Date(today + n * DAY_MS)));
}

export const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

/** Rough count shown to customers: about 2–2.4 mangoes per kg. */
export const mangoEstimate = (kg: number) => `${kg * 2}–${Math.round(kg * 2.4)}`;

export function durationLabel(sec: number | null) {
  if (!sec) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** Max videos per orchard before 1 month, and age (days) when a cleanup warning is sent. */
export const ORCHARD_VIDEO_LIMIT = 7;
export const ORCHARD_VIDEO_WARN_DAYS = 30;

export function orchardVideoStatus(count: number, oldestRecordedAt: Date | null, now = new Date()) {
  const atLimit = count >= ORCHARD_VIDEO_LIMIT;
  const oldestAgeDays = oldestRecordedAt
    ? Math.floor((now.getTime() - oldestRecordedAt.getTime()) / DAY_MS)
    : 0;
  const hasMonthOldVideo = oldestRecordedAt !== null && oldestAgeDays >= ORCHARD_VIDEO_WARN_DAYS;
  return {
    atLimit,
    oldestAgeDays,
    hasMonthOldVideo,
    needsCleanupWarning: atLimit && hasMonthOldVideo,
    canUpload: !atLimit || hasMonthOldVideo,
  };
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const orderNumber = (id: string) => id.slice(-6).toUpperCase();

/** How long a seller can keep a batch on sale, counted from the harvest day. */
export const LISTING_DAYS = [2, 3, 5];
export const DEFAULT_LISTING_DAYS = 3;

/** The customer confirms delivery; if they don't, the seller may after this long. */
export const CONFIRM_FALLBACK_DAYS = 2;

/** Why a seller cancels an order (only before packing), and whether its kg go back on sale. */
export const CANCEL_REASONS = [
  { reason: "Sold out", restock: false },
  { reason: "Mangoes not good enough to send", restock: false },
  { reason: "Can't deliver to this area", restock: true },
  { reason: "Customer asked to cancel", restock: true },
  { reason: "Something else", restock: true },
];

/** The last day a batch is on sale (closesAt is midnight after it, Dhaka time). */
export const lastSaleDay = (closesAt: Date) => dateLabel(new Date(closesAt.getTime() - 1));

/** A colour per mango variety (filter dots, batch badges); others get the mango colour. */
const VARIETY_COLORS: Record<string, string> = {
  Himsagar: "#A3BE3C",
  Langra: "#4F8A3A",
  Fazli: "#E3B92B",
  Amrapali: "#EE8A1F",
  Gopalbhog: "#D9A21B",
  Harivanga: "#C9A227",
};
export const varietyColor = (name: string) => VARIETY_COLORS[name] ?? "#F4A71D";

/** Choices on the "Report a problem" form (FR-21). */
export const COMPLAINT_REASONS = [
  "Damaged or bruised",
  "Spots or disease",
  "Less than I ordered",
  "Wrong variety",
  "Late delivery",
  "Something else",
];