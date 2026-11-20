import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ComplaintStatus, OrderStatus } from "@prisma/client";
import { AiResultView } from "@/components/ai-result";
import { Photo } from "@/components/photo";
import { Stars } from "@/components/stars";
import { requireUser } from "@/lib/auth";
import { parseStoredAi } from "@/lib/inspection";
import { APPROVAL_HOURS, approvalHoursLeft, CUSTOMER_CANCELLED, expireUnapprovedOrders, NOT_APPROVED_IN_TIME } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, taka, timeLabel } from "@/lib/shop";
import { ORDER_STATUS } from "../status";
import { CancelMyOrder, ConfirmDelivery, ReportForm, ReviewForm } from "./feedback-forms";

const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; tone: string }> = {
  OPEN: { label: "We're looking into it", tone: "bg-mango-soft text-mango-ink" },
  APPROVED: { label: "Approved", tone: "bg-green-100 text-green-900" },
  REJECTED: { label: "Not approved", tone: "bg-stone-200 text-stone-800" },
};

export const metadata: Metadata = { title: "Your order · Orchiva" };

const card = "rounded-3xl border border-line bg-white p-5";
const h2 = "font-display text-[21px] font-semibold text-ink";

// Order status (FR-19). Only the customer who placed the order can see it.
export default function OrderStatusPage({ params, searchParams }: PageProps<"/customer/orders/[id]">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-14 pt-3">
      <Suspense fallback={<div className="mt-3 h-96 animate-pulse rounded-3xl bg-line" aria-label="Loading order" />}>
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
  await expireUnapprovedOrders(); // the 24-hour approval rule
  const now = new Date();
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      batch: {
        select: {
          variety: { select: { name: true } },
          orchard: { select: { id: true, name: true, photoUrls: true } },
          seller: { select: { name: true } },
        },
      },
      deliveryArea: { select: { name: true } },
      review: true,
      complaints: { orderBy: { createdAt: "desc" } },
      boxes: { where: { aiCheckedAt: { not: null } }, orderBy: { aiCheckedAt: "desc" }, take: 1, select: { qrCode: true, aiDetections: true } },
    },
  });
  if (!order || order.customerId !== user.id) notFound();

  const sellerFirst = order.batch.seller.name.split(" ")[0];
  const aiCheck = parseStoredAi(order.boxes[0]?.aiDetections);
  const STEPS: { status: OrderStatus; title: string; note: string }[] = [
    { status: "PLACED", title: "Placed", note: "The seller has been told about your order." },
    { status: "APPROVED", title: "Approved by the seller", note: `${sellerFirst} approves it within ${APPROVAL_HOURS} hours.` },
    { status: "PACKED", title: "Packed and AI-checked", note: "The seller packs and photographs your mangoes." },
    { status: "DISPATCHED", title: "Dispatched", note: "On its way to you." },
    { status: "DELIVERED", title: "Delivered", note: `Pay ${taka(order.totalPrice)} in cash, then tap “I got my mangoes”.` },
  ];

  const justPlaced = sp.placed === "1";
  const cancelled = order.status === "CANCELLED";
  const reached = STEPS.findIndex((s) => s.status === order.status);
  const stamp: Partial<Record<OrderStatus, Date | null>> = {
    PLACED: order.createdAt,
    APPROVED: order.approvedAt,
    PACKED: order.packedAt,
    DISPATCHED: order.dispatchedAt,
    DELIVERED: order.deliveredAt,
  };
  const fruit = order.quantityKg * order.pricePerKg;
  const status = ORDER_STATUS[order.status];
  const hoursLeft = approvalHoursLeft(order.createdAt, now);
  const cancelText =
    order.cancelReason === CUSTOMER_CANCELLED
      ? "You cancelled this order."
      : order.cancelReason === NOT_APPROVED_IN_TIME
        ? `This order was cancelled because the seller didn't approve it within ${APPROVAL_HOURS} hours. You won't be charged.`
        : `The seller cancelled this order${order.cancelReason ? ` (${order.cancelReason.toLowerCase()})` : ""}. You won't be charged.`;

  return (
    <div className="space-y-4">
      {justPlaced ? (
        <section className="flex flex-col items-center gap-2 pb-2 pt-5 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-white">
            <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <h1 className="font-display text-[32px] font-semibold tracking-tight text-ink">Order placed</h1>
          <p className="text-muted">
            Order #{orderNumber(order.id)} · {taka(order.totalPrice)}, cash on delivery
          </p>
        </section>
      ) : (
        <header className="space-y-2.5">
          <Link href="/customer/orders" className="inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold text-ink hover:text-leaf">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </span>
            My orders
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Order #{orderNumber(order.id)}</h1>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status.tone}`}>{status.label}</span>
          </div>
          <p className="px-1 text-sm text-muted">
            Placed {dateLabel(order.createdAt)}, {timeLabel(order.createdAt)}
          </p>
        </header>
      )}

      {order.status === "PLACED" && (
        <section className="space-y-3 rounded-3xl border border-[#F2D9A6] bg-mango-soft p-5" aria-labelledby="waiting">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-mango-ink">
              <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            </span>
            <h2 id="waiting" className="font-display text-[21px] font-semibold text-[#3D2700]">
              Waiting for {sellerFirst} to approve
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed text-[#4A2E00]">
            Your {order.quantityKg} kg of {order.batch.variety.name} are held for you. If it isn&apos;t approved in time, the order is
            cancelled and you won&apos;t be charged.
          </p>
          <div className="space-y-1.5">
            <div
              role="img"
              aria-label={`${hoursLeft} of ${APPROVAL_HOURS} hours left to approve`}
              className="h-2 overflow-hidden rounded-full bg-[#F5DFAE]"
            >
              <div className="h-full rounded-full bg-[#C77700]" style={{ width: `${Math.round(((APPROVAL_HOURS - hoursLeft) / APPROVAL_HOURS) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs font-semibold text-[#4A2E00]">
              <span>Placed {APPROVAL_HOURS - hoursLeft} hours ago</span>
              <span>
                {hoursLeft} hour{hoursLeft === 1 ? "" : "s"} left
              </span>
            </div>
          </div>
          <CancelMyOrder orderId={order.id} />
        </section>
      )}

      <section className={card} aria-labelledby="status">
        <h2 id="status" className={`${h2} mb-4`}>
          Order status
        </h2>
        {cancelled ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 font-semibold text-red-800">{cancelText}</p>
        ) : (
          <ol>
            {STEPS.map((s, i) => {
              const done = i <= reached;
              const next = i === reached + 1;
              const at = stamp[s.status];
              return (
                <li key={s.status} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        done ? "bg-leaf text-white" : next ? "border-[3px] border-[#C77700] bg-mango-soft" : "border-2 border-[#D6CEBC] bg-white"
                      }`}
                    >
                      {done && (
                        <svg aria-hidden="true" className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      )}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span aria-hidden="true" className={`min-h-5 w-0.5 flex-1 ${i < reached ? "bg-leaf" : "bg-line"}`} />
                    )}
                  </div>
                  <div className={i < STEPS.length - 1 ? "pb-4" : ""}>
                    <p className={`flex flex-wrap items-center gap-2 text-[15px] ${done || next ? "font-bold text-ink" : "font-semibold text-muted"}`}>
                      {s.title}
                      {next && <span className="rounded-full bg-mango-soft px-2 py-0.5 text-[11px] font-bold text-mango-ink">Next</span>}
                      <span className="sr-only">{done ? " (done)" : next ? " (next)" : " (not yet)"}</span>
                    </p>
                    <p className="text-[13px] text-muted">{done && at ? `${dateLabel(at)}, ${timeLabel(at)}` : s.note}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {aiCheck && (order.status === "PACKED" || order.status === "DISPATCHED" || order.status === "DELIVERED") && (
        <section className={`${card} space-y-3`} aria-labelledby="ai-check">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="ai-check" className={h2}>
              AI check of your box
            </h2>
            {order.boxes[0]?.qrCode && (
              <Link
                href={`/verify/${encodeURIComponent(order.boxes[0].qrCode)}`}
                className="rounded-full bg-leaf-soft px-3 py-1 font-mono text-xs font-bold text-leaf hover:bg-[#DCE8D9]"
              >
                QR: {order.boxes[0].qrCode}
              </Link>
            )}
          </div>
          <p className="text-sm text-muted">
            {sellerFirst} recorded your box while packing it, and our AI looked at every mango.
          </p>
          <AiResultView data={aiCheck} />
        </section>
      )}

      {order.status === "DISPATCHED" && <ConfirmDelivery orderId={order.id} total={taka(order.totalPrice)} />}

      {(order.status === "APPROVED" || order.status === "PACKED") && (
        <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-muted">We&apos;ll let you know at each step. Check the bell at the top.</p>
      )}

      <section className={`${card} space-y-4`} aria-label="Order details">
        <div className="flex items-center gap-3.5">
          <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-line">
            <Photo src={order.batch.orchard.photoUrls[0] ?? "/images/orchard.png"} alt="" className="h-full w-full object-cover" />
          </span>
          <div>
            <p className="font-semibold text-ink">
              {order.quantityKg} kg {order.batch.variety.name}
            </p>
            <p className="text-[13px] text-muted">
              {order.batch.orchard.name} · {taka(order.pricePerKg)} per kg
            </p>
          </div>
        </div>
        <ul className="space-y-2.5 border-t border-[#F1EBDD] pt-4 text-sm text-ink">
          <li className="flex items-start gap-2.5">
            <svg aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
            <span>
              {order.address}
              {order.landmark ? ` (${order.landmark})` : ""}, {order.deliveryArea?.name ?? ""}, Dhaka
            </span>
          </li>
          {order.deliverySlot && (
            <li className="flex items-center gap-2.5">
              <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              {order.deliverySlot}
            </li>
          )}
          <li className="flex items-center gap-2.5">
            <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
            Cash on delivery
          </li>
        </ul>
        <dl className="space-y-1.5 border-t border-[#F1EBDD] pt-4 text-sm text-ink">
          <div className="flex justify-between"><dt>Mangoes</dt><dd>{taka(fruit)}</dd></div>
          {order.isGiftBox && <div className="flex justify-between"><dt>Gift box</dt><dd>{taka(order.giftFee)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{taka(order.deliveryFee)}</dd></div>
          <div className="flex items-baseline justify-between pt-1.5">
            <dt className="font-display text-[19px] font-semibold">Total</dt>
            <dd className="font-display text-2xl font-bold">{taka(order.totalPrice)}</dd>
          </div>
        </dl>
      </section>

      {!cancelled && (
        <section className={`${card} space-y-3`} aria-labelledby="review">
          <h2 id="review" className={h2}>
            {order.review ? "Your review" : "Rate your mangoes"}
          </h2>
          {order.review ? (
            <div className="space-y-1">
              <Stars rating={order.review.rating} size="h-5 w-5" />
              {order.review.comment && <p className="text-ink">{order.review.comment}</p>}
              <p className="text-xs text-muted">Shown on {order.batch.orchard.name}&apos;s page</p>
            </div>
          ) : order.status === "DELIVERED" ? (
            <ReviewForm orderId={order.id} />
          ) : (
            <p className="text-sm text-muted">You can rate these mangoes once they&apos;re delivered.</p>
          )}
        </section>
      )}

      {order.complaints.length > 0 && (
        <section className="space-y-3" aria-labelledby="reports">
          <h2 id="reports" className={`${h2} px-1`}>
            Your reports
          </h2>
          <ul className="space-y-2">
            {order.complaints.map((c) => {
              const s = COMPLAINT_STATUS[c.status];
              return (
                <li key={c.id} className="space-y-1.5 rounded-3xl border border-line bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{c.reason ?? "Problem"}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.tone}`}>
                      {c.status === "APPROVED" && c.resolution ? `${s.label}: ${c.resolution === "REFUND" ? "refund" : "replacement"}` : s.label}
                    </span>
                  </div>
                  <p className="text-sm text-ink">{c.message}</p>
                  {c.adminNote && <p className="rounded-2xl bg-cream px-3 py-2 text-sm text-ink">Reply: {c.adminNote}</p>}
                  {c.status === "APPROVED" && c.completedAt && (
                    <p className="text-sm font-semibold text-green-800">
                      {c.resolution === "REFUND" ? "Money returned" : "New box sent"} {dateLabel(c.completedAt)}
                    </p>
                  )}
                  <p className="text-xs text-muted">Sent {dateLabel(c.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!cancelled && !order.complaints.some((c) => c.status === "OPEN") && <ReportForm orderId={order.id} />}

      <Link
        href={`/customer/orchards/${order.batch.orchard.id}`}
        className="flex items-center gap-3.5 rounded-[20px] bg-leaf-soft p-3 text-ink hover:bg-[#DCE8D9]"
      >
        <span className="h-14 w-[72px] shrink-0 overflow-hidden rounded-xl bg-line">
          <Photo src={order.batch.orchard.photoUrls[0] ?? "/images/orchard.png"} alt="" className="h-full w-full object-cover" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Watch today&apos;s harvest</span>
          <span className="block text-[13px] text-[#3E5243]">{order.batch.orchard.name}</span>
        </span>
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      </Link>
      <Link href="/customer" className="flex min-h-12 items-center justify-center rounded-2xl border border-line bg-white font-semibold text-ink hover:bg-cream">
        Back to orchards
      </Link>
    </div>
  );
}