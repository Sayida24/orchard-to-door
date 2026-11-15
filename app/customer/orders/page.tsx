import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Photo } from "@/components/photo";
import { requireUser } from "@/lib/auth";
import { expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, taka } from "@/lib/shop";
import { ORDER_STATUS } from "./status";

export const metadata: Metadata = { title: "My orders · Orchiva" };

export default function MyOrdersPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-14 pt-6">
      <h1 className="mb-5 font-display text-[32px] font-semibold tracking-tight text-ink">My orders</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-line" aria-label="Loading orders" />}>
        <OrderList />
      </Suspense>
    </main>
  );
}

async function OrderList() {
  const user = await requireUser();
  await expireUnapprovedOrders(); // the 24-hour approval rule
  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      batch: { select: { variety: { select: { name: true } }, orchard: { select: { name: true, photoUrls: true } } } },
    },
  });

  if (orders.length === 0) {
    return (
      <div className="space-y-4 rounded-3xl border border-dashed border-[#D6CEBC] bg-white/60 p-8 text-center">
        <p className="font-display text-xl font-semibold text-ink">You haven&apos;t ordered yet.</p>
        <p className="text-muted">Watch today&apos;s harvest, pick an orchard, and order any amount.</p>
        <Link href="/customer" className="inline-flex h-12 items-center rounded-2xl bg-mango px-6 font-bold text-ink hover:bg-mango-dark">
          Browse orchards
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => {
        const status = ORDER_STATUS[o.status];
        return (
          <li key={o.id}>
            <Link
              href={`/customer/orders/${o.id}`}
              className="flex items-center gap-3.5 rounded-3xl border border-line bg-white p-3.5 transition hover:border-[#CFC7B5] hover:shadow-[0_10px_28px_rgba(27,42,31,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-line">
                <Photo src={o.batch.orchard.photoUrls[0] ?? "/images/orchard.png"} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  {o.quantityKg} kg {o.batch.variety.name}
                </span>
                <span className="block truncate text-[13px] text-muted">{o.batch.orchard.name}</span>
                <span className="block text-[13px] text-muted">
                  #{orderNumber(o.id)} · {dateLabel(o.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${status.tone}`}>{status.label}</span>
                <span className="mt-1.5 block font-display text-lg font-bold text-ink">{taka(o.totalPrice)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
