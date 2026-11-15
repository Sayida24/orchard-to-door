import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { dayLabel, deliverySlots, GIFT_BOX_FEE, openBatchWhere } from "@/lib/shop";
import { OrderForm } from "./order-form";

export const metadata: Metadata = { title: "Order · Orchiva" };

export default function OrderPage({ params }: PageProps<"/customer/orchards/[id]/order">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-3">
      <Suspense fallback={<div className="mt-3 h-96 animate-pulse rounded-3xl bg-stone-200" aria-label="Loading order form" />}>
        <OrderContent params={params} />
      </Suspense>
    </main>
  );
}

async function OrderContent({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await expireUnapprovedOrders(); // kg held by orders nobody approved in 24 hours go back on sale
  const now = new Date();

  const [orchard, areas] = await Promise.all([
    prisma.orchard.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        batches: {
          where: openBatchWhere(now),
          orderBy: { harvestDate: "desc" },
          select: { id: true, pricePerKg: true, availableKg: true, harvestDate: true, variety: { select: { name: true } } },
        },
      },
    }),
    prisma.deliveryArea.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, fee: true } }),
  ]);
  if (!orchard) notFound();

  const back = (
    <Link href={`/customer/orchards/${orchard.id}`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-stone-800 hover:text-amber-700">
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
      {orchard.name}
    </Link>
  );

  // Whole kilos only, so 12.5 kg left shows as 12 kg orderable.
  const batches = orchard.batches
    .map((b) => ({
      id: b.id,
      variety: b.variety.name,
      pricePerKg: b.pricePerKg,
      availableKg: Math.floor(b.availableKg),
      picked: `Picked ${dayLabel(b.harvestDate, now)}`,
    }))
    .filter((b) => b.availableKg >= 1);

  if (batches.length === 0 || areas.length === 0) {
    return (
      <div className="space-y-4">
        {back}
        <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-stone-700">
          {batches.length === 0
            ? "Nothing from this orchard is on sale right now. Check back after the next harvest."
            : "Delivery isn't available yet. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {back}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Your order</h1>
        <p className="text-stone-600">Straight from {orchard.name}, packed for you after you order.</p>
      </div>
      <OrderForm
        orchardId={orchard.id}
        batches={batches}
        areas={areas}
        slots={deliverySlots(now)}
        contact={{ name: user.name, phone: user.phone }}
        giftFee={GIFT_BOX_FEE}
      />
    </div>
  );
}
