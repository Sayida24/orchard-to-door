"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deliverySlots, GIFT_BOX_FEE, openBatchWhere } from "@/lib/shop";

export type PlaceOrderState = { error?: string } | undefined;

class OrderProblem extends Error {}

// FR-08 to FR-12: price = seller's price per kg × kg, stock goes down in the
// same transaction, the batch closes when sold out, and the seller is notified.
// Everything is re-checked here; the browser's numbers are never trusted.
export async function placeOrder(_prev: PlaceOrderState, fd: FormData): Promise<PlaceOrderState> {
  const user = await requireUser();

  const orchardId = String(fd.get("orchardId") ?? "");
  const batchId = String(fd.get("batchId") ?? "");
  const kg = Number(fd.get("kg"));
  const gift = fd.get("gift") === "1";
  const areaId = String(fd.get("areaId") ?? "");
  const address = String(fd.get("address") ?? "").trim().slice(0, 200);
  const landmark = String(fd.get("landmark") ?? "").trim().slice(0, 120);
  const slot = String(fd.get("slot") ?? "");
  const now = new Date();

  if (!Number.isInteger(kg) || kg < 1) return { error: "Choose how many kg you want (at least 1 kg)." };
  if (address.length < 5) return { error: "Enter your house, flat and road." };
  if (!deliverySlots(now).includes(slot)) return { error: "Choose a delivery time again — the times have changed." };

  const area = await prisma.deliveryArea.findFirst({ where: { id: areaId, isActive: true } });
  if (!area) return { error: "Choose your area in Dhaka." };

  let orderId: string;
  try {
    orderId = await prisma.$transaction(
      async (tx) => {
        const batch = await tx.batch.findFirst({
          where: { id: batchId, orchardId, ...openBatchWhere(now) },
          include: { variety: true },
        });
        if (!batch) throw new OrderProblem("These mangoes are no longer on sale. Please choose again.");

        // Take the kilos only if they are still there (two customers can't buy the same stock).
        const taken = await tx.batch.updateMany({
          where: { id: batch.id, status: "OPEN", availableKg: { gte: kg } },
          data: { availableKg: { decrement: kg } },
        });
        if (taken.count === 0) {
          throw new OrderProblem(`Only ${Math.floor(batch.availableKg)} kg of ${batch.variety.name} is left.`);
        }
        if (batch.availableKg - kg <= 0) {
          await tx.batch.update({ where: { id: batch.id }, data: { status: "SOLD_OUT" } });
        }

        const giftFee = gift ? GIFT_BOX_FEE : 0;
        const order = await tx.order.create({
          data: {
            quantityKg: kg,
            pricePerKg: batch.pricePerKg,
            isGiftBox: gift,
            giftFee,
            deliveryFee: area.fee,
            totalPrice: kg * batch.pricePerKg + giftFee + area.fee,
            address,
            landmark: landmark || null,
            deliverySlot: slot,
            deliveryAreaId: area.id,
            customerId: user.id,
            batchId: batch.id,
          },
        });

        await tx.notification.create({
          data: {
            userId: batch.sellerId,
            message: `New order: ${kg} kg ${batch.variety.name} to ${area.name}, ${slot}`,
            link: "/seller",
          },
        });
        return order.id;
      },
      { maxWait: 10_000, timeout: 20_000 }, // the database is in Singapore; allow for slow links
    );
  } catch (e) {
    if (e instanceof OrderProblem) return { error: e.message };
    throw e;
  }

  redirect(`/customer/orders/${orderId}?placed=1`);
}
