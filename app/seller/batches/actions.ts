"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isUniqueError, optStr, str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { DAY_MS, dhakaDayStart, LISTING_DAYS } from "@/lib/shop";

export type BatchState = { error?: string; ok?: string } | undefined;

const MAX_KG = 10_000;
const MAX_PRICE = 5_000;

function revalidateBatch(orchardId: string, batchId?: string) {
  revalidatePath("/seller");
  revalidatePath("/seller/batches");
  if (batchId) revalidatePath(`/seller/batches/${batchId}`);
  revalidatePath("/customer");
  revalidatePath(`/customer/orchards/${orchardId}`);
}

/** Empty -> null, 1–12 -> the month, anything else -> NaN (caller rejects it). */
function month(fd: FormData, key: string) {
  const v = str(fd, key);
  if (!v) return null;
  const m = Number(v);
  return Number.isInteger(m) && m >= 1 && m <= 12 ? m : NaN;
}

/** A variety with the same name, ignoring capitals ("himsagar" = "Himsagar"). */
function findVariety(name: string) {
  return prisma.variety.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
}

// FR-05 / FR-08: a seller lists a harvest batch from one of their orchards, with their
// own price per kg. The variety comes from the shared list; a new one is added (it's
// also its Mango Guide entry) unless one with the same name already exists.
export async function createBatch(_prev: BatchState, fd: FormData): Promise<BatchState> {
  const user = await requireUser(["SELLER"]);
  const orchardId = str(fd, "orchardId");
  const varietyId = str(fd, "varietyId");
  const pickedDaysAgo = Number(str(fd, "picked"));
  const totalKg = Number(str(fd, "totalKg"));
  const pricePerKg = Number(str(fd, "pricePerKg"));
  const days = Number(str(fd, "days"));

  const orchard = await prisma.orchard.findFirst({
    where: { id: orchardId, sellerId: user.id },
    select: { id: true, isActive: true },
  });
  if (!orchard) return { error: "Choose your orchard." };
  if (!orchard.isActive) return { error: "An admin has paused this orchard, so it can't list batches right now." };
  if (![0, 1, 2].includes(pickedDaysAgo)) return { error: "Choose when these mangoes were picked." };
  if (!Number.isInteger(totalKg) || totalKg < 1 || totalKg > MAX_KG) {
    return { error: "Enter how many kg you have, in whole kg (1 to 10,000)." };
  }
  if (!Number.isInteger(pricePerKg) || pricePerKg < 1 || pricePerKg > MAX_PRICE) {
    return { error: "Enter your price per kg in whole taka (৳1 to ৳5,000)." };
  }
  if (!LISTING_DAYS.includes(days)) return { error: "Choose how long to sell: 2, 3 or 5 days." };

  // On sale from the picking day, for the chosen number of days (Dhaka time).
  const now = new Date();
  const harvestDate = new Date(dhakaDayStart(now).getTime() - pickedDaysAgo * DAY_MS);
  const closesAt = new Date(harvestDate.getTime() + days * DAY_MS);
  if (closesAt <= now) return { error: `Mangoes picked ${pickedDaysAgo} days ago would already be off sale. Choose 3 or 5 days.` };

  let resolvedVarietyId: string;
  if (varietyId === "new") {
    const name = str(fd, "varietyName").replace(/\s+/g, " ");
    const seasonStart = month(fd, "seasonStart");
    const seasonEnd = month(fd, "seasonEnd");
    if (name.length < 2 || name.length > 40) return { error: "Enter the variety's name, e.g. Himsagar." };
    if (Number.isNaN(seasonStart) || Number.isNaN(seasonEnd)) return { error: "Choose the season months again." };
    if ((seasonStart === null) !== (seasonEnd === null)) return { error: "Choose both season months, or leave both empty." };

    const existing = await findVariety(name);
    if (existing) {
      resolvedVarietyId = existing.id;
    } else {
      try {
        const created = await prisma.variety.create({
          data: {
            name,
            seasonStart,
            seasonEnd,
            taste: optStr(fd, "taste")?.slice(0, 120) ?? null,
            bestUse: optStr(fd, "bestUse")?.slice(0, 120) ?? null,
            addedById: user.id,
          },
          select: { id: true },
        });
        resolvedVarietyId = created.id;
      } catch (e) {
        // Another seller added the same name a moment ago: use theirs.
        const again = isUniqueError(e) ? await findVariety(name) : null;
        if (!again) throw e;
        resolvedVarietyId = again.id;
      }
    }
  } else {
    const variety = await prisma.variety.findUnique({ where: { id: varietyId }, select: { id: true } });
    if (!variety) return { error: "Choose the variety." };
    resolvedVarietyId = variety.id;
  }

  const batch = await prisma.batch.create({
    data: {
      harvestDate,
      totalKg,
      availableKg: totalKg,
      pricePerKg,
      closesAt,
      orchardId: orchard.id,
      varietyId: resolvedVarietyId,
      sellerId: user.id,
      spinImageUrls: [],
    },
    select: { id: true },
  });
  revalidateBatch(orchard.id, batch.id);
  redirect(`/seller/batches/${batch.id}?listed=1`);
}

/** The seller's batch if it can still be changed (not stopped, not past its last day). */
function editableBatch(id: string, sellerId: string) {
  return prisma.batch.findFirst({
    where: { id, sellerId, status: { not: "CLOSED" }, OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] },
    select: { orchardId: true, availableKg: true, totalKg: true },
  });
}

// The price can change any time: new orders use it, placed orders keep theirs.
export async function updatePrice(_prev: BatchState, fd: FormData): Promise<BatchState> {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "batchId");
  const pricePerKg = Number(str(fd, "pricePerKg"));
  if (!Number.isInteger(pricePerKg) || pricePerKg < 1 || pricePerKg > MAX_PRICE) {
    return { error: "Enter a price per kg in whole taka (৳1 to ৳5,000)." };
  }
  const batch = await editableBatch(id, user.id);
  if (!batch) return { error: "This batch has ended, so it can't be changed." };

  await prisma.batch.update({ where: { id }, data: { pricePerKg } });
  revalidateBatch(batch.orchardId, id);
  return { ok: "Price saved. Orders already placed keep the price they were placed at." };
}

// Correct the kg left (some spoiled, or more was picked). 0 marks it sold out.
export async function updateStock(_prev: BatchState, fd: FormData): Promise<BatchState> {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "batchId");
  const left = Number(str(fd, "availableKg"));
  if (!Number.isInteger(left) || left < 0 || left > MAX_KG) return { error: "Enter the kg left in whole kg (0 to 10,000)." };
  const batch = await editableBatch(id, user.id);
  if (!batch) return { error: "This batch has ended, so it can't be changed." };

  const added = left - batch.availableKg;
  // Only if no order changed the stock in the meantime.
  const saved = await prisma.batch.updateMany({
    where: { id, availableKg: batch.availableKg },
    data: {
      availableKg: left,
      totalKg: added > 0 ? batch.totalKg + added : batch.totalKg,
      status: left === 0 ? "SOLD_OUT" : "OPEN",
    },
  });
  if (saved.count === 0) return { error: "An order just came in. Check the new numbers and try again." };
  revalidateBatch(batch.orchardId, id);
  return { ok: left === 0 ? "Marked as sold out." : `Saved: ${left} kg left to sell.` };
}

// Take a batch off sale early. Orders already placed carry on.
export async function stopSelling(fd: FormData) {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "batchId");
  const batch = await prisma.batch.findFirst({ where: { id, sellerId: user.id }, select: { orchardId: true } });
  if (!batch) return;
  await prisma.batch.updateMany({ where: { id, sellerId: user.id, status: { not: "CLOSED" } }, data: { status: "CLOSED" } });
  revalidateBatch(batch.orchardId, id);
}
