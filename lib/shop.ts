import type { Prisma } from "@prisma/client";

// Shared rules and formatting for the customer shop.

export const GIFT_BOX_FEE = 120; // taka, added once per order
export const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Bangladesh is UTC+6 all year

/** Sellers must remove uploaded orchard videos within 3 days. */
export const ORCHARD_VIDEO_MAX_DAYS = 3;
export const ORCHARD_VIDEO_MAX_MS = ORCHARD_VIDEO_MAX_DAYS * DAY_MS;

export const videoExpiresAt = (recordedAt: Date) => new Date(recordedAt.getTime() + ORCHARD_VIDEO_MAX_MS);
export const videoCutoffDate = (now: Date) => new Date(now.getTime() - ORCHARD_VIDEO_MAX_MS);

export function videoRemainingLabel(recordedAt: Date, now: Date) {
  const diff = videoExpiresAt(recordedAt).getTime() - now.getTime();
  if (diff <= 0) {
    const overHours = Math.max(1, Math.floor(Math.abs(diff) / HOUR_MS));
    const days = Math.floor(overHours / 24);
    const hours = overHours % 24;
    const span = days > 0 ? `${days}d ${hours}h` : `${overHours}h`;
    return { overdue: true, urgent: true, label: `Overdue by ${span} — remove now` };
  }
  const totalHours = Math.max(1, Math.ceil(diff / HOUR_MS));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (totalHours <= 24) {
    return { overdue: false, urgent: true, label: `Remove within ${totalHours}h` };
  }
  return { overdue: false, urgent: false, label: `${days}d ${hours}h left to remove` };
}

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