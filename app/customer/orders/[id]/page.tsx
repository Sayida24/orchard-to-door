import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ComplaintStatus, OrderStatus } from "@prisma/client";
import { Stars } from "@/components/stars";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, taka, timeLabel } from "@/lib/shop";
import { ConfirmDelivery, ReportForm, ReviewForm } from "./feedback-forms";

const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; tone: string }> = {
  OPEN: { label: "We're looking into it", tone: "bg-amber-100 text-amber-900" },
  APPROVED: { label: "Approved", tone: "bg-green-100 text-green-900" },
  REJECTED: { label: "Not approved", tone: "bg-stone-200 text-stone-800" },
};

export const metadata: Metadata = { title: "Your order · Orchiva" };

const STEPS: { status: OrderStatus; title: string; note: string }[] = [
  { status: "PLACED", title: "Placed", note: "The seller has been told about your order." },
  { status: "PACKED", title: "Packed and AI-checked", note: "The seller packs and photographs your mangoes. You'll see the AI check here." },
  { status: "DISPATCHED", title: "Dispatched", note: "On its way to you." },
  { status: "DELIVERED", title: "Delivered", note: "Pay in cash when it arrives, then tap “I got my mangoes”." },
];

// Order status (FR-19). Only the customer who placed the order can see it.
export default function OrderStatusPage({ params, searchParams }: PageProps<"/customer/orders/[id]">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-stone-200" aria-label="Loading order" />}>
        <OrderStatusContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function OrderStatusContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      batch: { select: { variety: { select: { name: true } }, orchard: { select: { id: true, name: true } } } },
      deliveryArea: { select: { name: true } },
      review: true,
      complaints: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order || order.customerId !== user.id) notFound();

  const justPlaced = sp.placed === "1";
  const cancelled = order.status === "CANCELLED";
  const reached = STEPS.findIndex((s) => s.status === order.status);
  const stamp: Partial<Record<OrderStatus, Date | null>> = {
    PLACED: order.createdAt,
    PACKED: order.packedAt,
    DISPATCHED: order.dispatchedAt,
    DELIVERED: order.deliveredAt,
  };
  const fruit = order.quantityKg * order.pricePerKg;

  return (
    <div className="space-y-5">
      {justPlaced ? (
        <section className="flex flex-col items-center gap-2 pt-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-800">
            <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Order placed</h1>
          <p className="text-stone-600">
            Order #{orderNumber(order.id)} · {taka(order.totalPrice)}, cash on delivery
          </p>
        </section>
      ) : (
        <div>
          <Link href="/customer/orders" className="inline-flex min-h-11 items-center gap-1 font-semibold text-stone-800 hover:text-amber-700">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            My orders
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Order #{orderNumber(order.id)}</h1>
        </div>
      )}

      <section className="space-y-1 rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-lg font-bold text-stone-900">
          {order.batch.variety.name} · {order.quantityKg} kg × {taka(order.pricePerKg)}
        </p>
        <p className="text-sm text-stone-600">{order.batch.orchard.name}</p>
        <p className="text-sm text-stone-600">
          {order.address}
          {order.landmark ? ` (${order.landmark})` : ""}, {order.deliveryArea?.name ?? ""}, Dhaka
        </p>
        {order.deliverySlot && <p className="text-sm text-stone-600">{order.deliverySlot}</p>}
        <dl className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm text-stone-700">
          <div className="flex justify-between"><dt>Mangoes</dt><dd>{taka(fruit)}</dd></div>
          {order.isGiftBox && <div className="flex justify-between"><dt>Gift box</dt><dd>{taka(order.giftFee)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{taka(order.deliveryFee)}</dd></div>
          <div className="flex justify-between pt-1 text-base font-bold text-stone-900"><dt>Total (cash on delivery)</dt><dd>{taka(order.totalPrice)}</dd></div>
        </dl>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4" aria-labelledby="status">
        <h2 id="status" className="mb-4 font-bold text-stone-900">Order status</h2>
        {cancelled ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-800">
            The seller cancelled this order{order.cancelReason ? ` (${order.cancelReason.toLowerCase()})` : ""}. You
            won&apos;t be charged.
          </p>
        ) : (
          <ol>
            {STEPS.map((s, i) => {
              const done = i <= reached;
              const next = i === reached + 1;
              const at = stamp[s.status];
              return (
                <li key={s.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        done ? "bg-green-800 text-white" : next ? "border-2 border-amber-700 bg-amber-50" : "border-2 border-stone-300 bg-white"
                      }`}
                    >
                      {done && (
                        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      )}
                    </span>
                    {i < STEPS.length - 1 && <span aria-hidden="true" className="min-h-5 w-0.5 flex-1 bg-stone-200" />}
                  </div>
                  <div className={i < STEPS.length - 1 ? "pb-4" : ""}>
                    <p className={`font-bold ${done || next ? "text-stone-900" : "text-stone-600"}`}>
                      {s.title}
                      {next && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Next</span>}
                      <span className="sr-only">{done ? " (done)" : next ? " (next)" : " (not yet)"}</span>
                    </p>
                    <p className="text-sm text-stone-600">{done && at ? `${dateLabel(at)}, ${timeLabel(at)}` : s.note}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {order.status === "DISPATCHED" && <ConfirmDelivery orderId={order.id} total={taka(order.totalPrice)} />}

      {(order.status === "PLACED" || order.status === "PACKED") && (
        <p className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
          We&apos;ll let you know at each step. Check the bell at the top.
        </p>
      )}

      {!cancelled && (
        <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4" aria-labelledby="review">
          <h2 id="review" className="font-bold text-stone-900">
            {order.review ? "Your review" : "Rate your mangoes"}
          </h2>
          {order.review ? (
            <div className="space-y-1">
              <Stars rating={order.review.rating} size="h-5 w-5" />
              {order.review.comment && <p className="text-stone-700">{order.review.comment}</p>}
              <p className="text-xs text-stone-500">Shown on {order.batch.orchard.name}&apos;s page</p>
            </div>
          ) : order.status === "DELIVERED" ? (
            <ReviewForm orderId={order.id} />
          ) : (
            <p className="text-sm text-stone-600">You can rate these mangoes once they&apos;re delivered.</p>
          )}
        </section>
      )}

      {order.complaints.length > 0 && (
        <section className="space-y-3" aria-labelledby="reports">
          <h2 id="reports" className="font-bold text-stone-900">
            Your reports
          </h2>
          <ul className="space-y-2">
            {order.complaints.map((c) => {
              const s = COMPLAINT_STATUS[c.status];
              return (
                <li key={c.id} className="space-y-1 rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-stone-900">{c.reason ?? "Problem"}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.tone}`}>
                      {c.status === "APPROVED" && c.resolution ? `${s.label}: ${c.resolution === "REFUND" ? "refund" : "replacement"}` : s.label}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700">{c.message}</p>
                  {c.adminNote && <p className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-700">Reply: {c.adminNote}</p>}
                  {c.status === "APPROVED" && c.completedAt && (
                    <p className="text-sm font-semibold text-green-800">
                      {c.resolution === "REFUND" ? "Money returned" : "New box sent"} {dateLabel(c.completedAt)}
                    </p>
                  )}
                  <p className="text-xs text-stone-500">Sent {dateLabel(c.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!cancelled && !order.complaints.some((c) => c.status === "OPEN") && <ReportForm orderId={order.id} />}

      <div className="grid gap-3">
        <Link href="/customer" className="flex min-h-12 items-center justify-center rounded-2xl bg-stone-900 font-bold text-white hover:bg-stone-800">
          Back to orchards
        </Link>
        <Link
          href={`/customer/orchards/${order.batch.orchard.id}`}
          className="flex min-h-12 items-center justify-center rounded-2xl border border-stone-300 bg-white font-semibold text-stone-900 hover:bg-stone-50"
        >
          Watch {order.batch.orchard.name}&apos;s harvest
        </Link>
      </div>
    </div>
  );
}
