import { prisma } from "@/lib/prisma";
import { DAY_MS, ORCHARD_VIDEO_WARN_DAYS, orchardVideoStatus } from "@/lib/shop";

export type OrchardVideoWarning = {
  orchardId: string;
  orchardName: string;
  count: number;
  oldestAgeDays: number;
};

/**
 * Checks each of a seller's orchards: if an orchard has 7+ videos and its oldest video
 * is at least 1 month (30 days) old, sends an on-site warning notification (at most once
 * per 30 days per orchard) asking the seller to remove old videos. Returns active warnings.
 */
export async function syncOrchardVideoWarnings(sellerId: string): Promise<OrchardVideoWarning[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - ORCHARD_VIDEO_WARN_DAYS * DAY_MS);

  const orchards = await prisma.orchard.findMany({
    where: { sellerId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      videos: {
        orderBy: { recordedAt: "asc" },
        select: { recordedAt: true },
      },
    },
  });

  const warnings: OrchardVideoWarning[] = [];

  for (const orchard of orchards) {
    const oldest = orchard.videos[0]?.recordedAt ?? null;
    const status = orchardVideoStatus(orchard.videos.length, oldest, now);
    if (!status.needsCleanupWarning) continue;

    warnings.push({
      orchardId: orchard.id,
      orchardName: orchard.name,
      count: orchard.videos.length,
      oldestAgeDays: status.oldestAgeDays,
    });

    const link = `/seller/media?orchard=${orchard.id}`;
    const existing = await prisma.notification.findFirst({
      where: {
        userId: sellerId,
        link,
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: sellerId,
          link,
          message: `Orchard "${orchard.name}" has ${orchard.videos.length} videos and the oldest is over 1 month old. Please remove older videos (you can still upload new ones).`,
        },
      });
    }
  }

  return warnings;
}