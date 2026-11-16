import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { APPROVAL_HOURS, expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { dayLabel, deliveryDays, GIFT_BOX_FEE, openBatchWhere } from "@/lib/shop";
import { OrderForm } from "./order-form";

export const metadata: Metadata = { title: "Order · Orchiva" };

export default function OrderPage({ params }: PageProps<"/customer/orchards/[id]/order">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-3">
      <Suspense fallback={<div className="mt-3 h-96 animate-pulse rounded-3xl bg-line" aria-label="Loading order form" />}>
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
        seller: { select: { name: true } },
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
    <Link
      href={`/customer/orchards/${orchard.id}`}
      className="inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold text-ink hover:text-leaf"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white">
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </span>
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
      <div className="space-y-4 pb-12">
        {back}
        <p className="rounded-3xl border border-dashed border-[#D6CEBC] bg-white/60 p-6 text-muted">
          {batches.length === 0
            ? "Nothing from this orchard is on sale right now. Check back after the next harvest."
            : "Delivery isn't available yet. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {back}
        <div className="px-1">
          <h1 className="font-display text-[32px] font-semibold tracking-tight text-ink">Your order</h1>
          <p className="text-muted">Straight from {orchard.name}, packed for you after the seller approves.</p>
        </div>
      </div>
      <OrderForm
        orchardId={orchard.id}
        sellerFirst={orchard.seller.name.split(" ")[0]}
        batches={batches}
        areas={areas}
        days={deliveryDays(now)}
        contact={{ name: user.name, phone: user.phone }}
        giftFee={GIFT_BOX_FEE}
        approvalHours={APPROVAL_HOURS}
      />
    </div>
  );
}
