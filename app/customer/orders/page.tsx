import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { OrderStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, taka } from "@/lib/shop";

export const metadata: Metadata = { title: "My orders · Orchiva" };

const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  PLACED: { label: "Waiting for seller", tone: "bg-amber-100 text-amber-900" },
  APPROVED: { label: "Approved", tone: "bg-lime-100 text-lime-900" },
  PACKED: { label: "Packed", tone: "bg-sky-100 text-sky-900" },
  DISPATCHED: { label: "On the way", tone: "bg-indigo-100 text-indigo-900" },
  DELIVERED: { label: "Delivered", tone: "bg-green-100 text-green-900" },
  CANCELLED: { label: "Cancelled", tone: "bg-stone-200 text-stone-800" },
};

export default function MyOrdersPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-6">
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-stone-900">My orders</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-stone-200" aria-label="Loading orders" />}>
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
    include: { batch: { select: { variety: { select: { name: true } }, orchard: { select: { name: true } } } } },
  });

  if (orders.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-stone-300 p-6 text-center">
        <p className="text-stone-700">You haven&apos;t ordered yet.</p>
        <Link href="/customer" className="inline-flex min-h-11 items-center rounded-2xl bg-amber-500 px-5 font-bold text-stone-900 hover:bg-amber-400">
          Browse orchards
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/customer/orders/${o.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4 hover:border-amber-400">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-stone-900">
                  {o.batch.variety.name} · {o.quantityKg} kg
                </p>
                <p className="truncate text-sm text-stone-600">{o.batch.orchard.name}</p>
                <p className="text-sm text-stone-600">
                  #{orderNumber(o.id)} · {dateLabel(o.createdAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[o.status].tone}`}>{STATUS[o.status].label}</span>
                <p className="mt-1 font-bold text-stone-900">{taka(o.totalPrice)}</p>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
