import { prisma } from "@/lib/prisma";
import { DAY_MS } from "@/lib/shop";

// An orchard "needs attention" when either rule below is met. Change the numbers here.
// Sellers decide on reports about their own orders, so every report counts here, whatever
// the seller decided: rejecting reports can't hide an orchard's problems.
export const FLAG_REPORTS = 3; // problem reports…
export const FLAG_WINDOW_DAYS = 30; // …made within this many days
export const FLAG_RATING_BELOW = 3; // or an average rating below this many stars

export type OrchardQuality = {
  rating: number | null;
  reviews: number;
  open: number;
  approved: number;
  rejected: number;
  recent: number; // reports made within FLAG_WINDOW_DAYS, whatever was decided
  reasons: [string, number][]; // most common first
  flagged: boolean;
};

export const NO_QUALITY_DATA: OrchardQuality = {
  rating: null,
  reviews: 0,
  open: 0,
  approved: 0,
  rejected: 0,
  recent: 0,
  reasons: [],
  flagged: false,
};

/**
 * Ratings and problem reports per orchard id, for the admin. Pass the current time
 * (read it after `connection()`), and an orchard id to load just that one.
 */
export async function orchardQuality(now: Date, orchardId?: string): Promise<Map<string, OrchardQuality>> {
  const since = new Date(now.getTime() - FLAG_WINDOW_DAYS * DAY_MS);
  const [ratings, reports] = await Promise.all([
    prisma.review.groupBy({
      by: ["orchardId"],
      where: orchardId ? { orchardId } : {},
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.complaint.findMany({
      where: orchardId ? { order: { batch: { orchardId } } } : {},
      select: { status: true, reason: true, createdAt: true, order: { select: { batch: { select: { orchardId: true } } } } },
    }),
  ]);

  const map = new Map<string, OrchardQuality & { reasonCounts: Map<string, number> }>();
  const entry = (id: string) => {
    let q = map.get(id);
    if (!q) map.set(id, (q = { ...NO_QUALITY_DATA, reasons: [], reasonCounts: new Map() }));
    return q;
  };

  for (const r of ratings) {
    const q = entry(r.orchardId);
    q.rating = r._avg.rating;
    q.reviews = r._count._all;
  }
  for (const c of reports) {
    const q = entry(c.order.batch.orchardId);
    if (c.status === "OPEN") q.open++;
    else if (c.status === "REJECTED") q.rejected++;
    else q.approved++;
    if (c.createdAt >= since) q.recent++;
    const reason = c.reason ?? "Something else";
    q.reasonCounts.set(reason, (q.reasonCounts.get(reason) ?? 0) + 1);
  }

  const result = new Map<string, OrchardQuality>();
  for (const [id, { reasonCounts, ...q }] of map) {
    q.reasons = [...reasonCounts].sort((a, b) => b[1] - a[1]);
    q.flagged = q.recent >= FLAG_REPORTS || (q.rating !== null && q.rating < FLAG_RATING_BELOW);
    result.set(id, q);
  }
  return result;
}

/** Why an orchard is flagged, in one line. */
export function flagReason(q: OrchardQuality) {
  if (q.recent >= FLAG_REPORTS) {
    return `${q.recent} problem reports in the last ${FLAG_WINDOW_DAYS} days`;
  }
  return q.rating !== null ? `Average rating ${q.rating.toFixed(1)}★, below ${FLAG_RATING_BELOW}★` : "";
}
