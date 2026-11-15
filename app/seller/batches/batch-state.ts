import type { BatchStatus } from "@prisma/client";

type BatchLike = { status: BatchStatus; availableKg: number; closesAt: Date | null; orchard: { isActive: boolean } };

/** What a seller's batch looks like to customers right now. Only "ended" batches can't be changed. */
export function batchState(b: BatchLike, now: Date) {
  if (b.status === "CLOSED" || (b.closesAt !== null && b.closesAt <= now)) {
    return { key: "ended", label: "Ended", tone: "bg-stone-200 text-stone-700" } as const;
  }
  if (b.status === "SOLD_OUT" || b.availableKg <= 0) {
    return { key: "soldout", label: "Sold out", tone: "bg-amber-100 text-amber-900" } as const;
  }
  if (!b.orchard.isActive) return { key: "paused", label: "Orchard paused", tone: "bg-stone-800 text-white" } as const;
  return { key: "onsale", label: "On sale", tone: "bg-green-100 text-green-900" } as const;
}
