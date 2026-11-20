import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { OrderStatus } from "@prisma/client";
import { Stars } from "@/components/stars";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONFIRM_FALLBACK_DAYS, DAY_MS, dateLabel, orderNumber, taka, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { approvalHoursLeft, expireUnapprovedOrders } from "@/lib/orders";
import { approveOrder, dispatchOrder, markDelivered, packOrder } from "./actions";
import { CancelOrder } from "./cancel-order";

const TABS: { key: string; status: OrderStatus; label: string }[] = [
  { key: "new", status: "PLACED", label: "To approve" },
  { key: "approved", status: "APPROVED", label: "To pack" },
  { key: "packed", status: "PACKED", label: "To dispatch" },
  { key: "dispatched", status: "DISPATCHED", label: "On the way" },
  { key: "delivered", status: "DELIVERED", label: "Delivered" },
  { key: "cancelled", status: "CANCELLED", label: "Cancelled" },
];

// FR-12 / FR-19: the seller's orders, step by step. Only this seller's orders are shown,
// with the customer's contact details needed to deliver them.
export default function SellerOrdersPage({ searchParams }: PageProps<"/seller/orders">) {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Orders &amp; packing</h1>
      <Suspense fallback={<p className="text-stone-500">Loading orders…</p>}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function loadOrders(sellerId: string, status: OrderStatus) {
  return prisma.order.findMany({
    where: { batch: { sellerId }, status },
    // Work queues show the oldest first; history shows the newest first.
    orderBy: { createdAt: status === "PLACED" || status === "APPROVED" || status === "PACKED" ? "asc" : "desc" },
    take: 100,
    include: {
      customer: { select: { name: true, phone: true } },
      deliveryArea: { select: { name: true } },
      batch: { select: { variety: { select: { name: true } }, orchard: { select: { name: true } } } },
      review: { select: { rating: true, comment: true } },
      // Reports the seller still has to decide on or finish.
      complaints: { where: { OR: [{ status: "OPEN" }, { status: "APPROVED", completedAt: null }] }, select: { id: true } },
      boxes: { where: { aiCheckedAt: { not: null } }, orderBy: { aiCheckedAt: "desc" }, take: 1, select: { qrCode: true } },
    },
  });
}
type Row = Awaited<ReturnType<typeof loadOrders>>[number];

async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser(["SELLER"]);
  await connection();
  await expireUnapprovedOrders(); // the 24-hour rule, checked whenever orders are looked at
  const show = (await searchParams).show;
  const tab = TABS.find((t) => t.key === show) ?? TABS[0];
  const now = new Date();
  const mine = { batch: { sellerId: user.id } };

  const [counts, reportsToDo, orders] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: mine, _count: { _all: true } }),
    prisma.complaint.count({ where: { OR: [{ status: "OPEN" }, { status: "APPROVED", completedAt: null }], order: mine } }),
    loadOrders(user.id, tab.status),
  ]);
  const countOf = (s: OrderStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-5">
      {reportsToDo > 0 && (
        <Link
          href="/seller/reports"
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 font-bold text-red-900 hover:bg-red-100"
        >
          <span>
            {reportsToDo} problem report{reportsToDo === 1 ? "" : "s"} to decide or finish
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Order steps">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "new" ? "/seller/orders" : `/seller/orders?show=${t.key}`}
            aria-current={t === tab ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
              t === tab ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {t.label} ({countOf(t.status)})
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className={`${ui.card} text-stone-600`}>No orders here.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.id} o={o} now={now} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ o, now }: { o: Row; now: Date }) {
  return (
    <li className={`${ui.card} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-stone-900">
            #{orderNumber(o.id)} · {o.quantityKg} kg {o.batch.variety.name}
            {o.isGiftBox && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Gift box</span>}
          </p>
          <p className="text-sm text-stone-600">
            Placed {dateLabel(o.createdAt)}, {timeLabel(o.createdAt)} · {o.batch.orchard.name}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-stone-900">{taka(o.totalPrice)}</p>
          <p className="text-xs text-stone-500">cash on delivery</p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-stone-500">Customer</dt>
          <dd className="text-stone-800">
            {o.customer.name} ·{" "}
            <a href={`tel:${o.customer.phone}`} className={ui.link}>
              {o.customer.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Deliver to</dt>
          <dd className="text-stone-800">
            {o.address}
            {o.landmark ? ` (${o.landmark})` : ""}, {o.deliveryArea?.name ?? ""}, Dhaka
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Deliver on</dt>
          <dd className="text-stone-800">{o.deliverySlot ?? "Any time"}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Bill</dt>
          <dd className="text-stone-800">
            {o.quantityKg} kg × {taka(o.pricePerKg)}
            {o.isGiftBox ? ` + gift box ${taka(o.giftFee)}` : ""} + delivery {taka(o.deliveryFee)}
          </dd>
        </div>
      </dl>

      {o.complaints.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          The customer reported a problem.{" "}
          <Link href="/seller/reports" className="underline underline-offset-2 hover:no-underline">
            Open reports
          </Link>
        </p>
      )}

      <OrderActions o={o} now={now} />
    </li>
  );
}

function OrderActions({ o, now }: { o: Row; now: Date }) {
  const hidden = <input type="hidden" name="orderId" value={o.id} />;
  const first = o.customer.name.split(" ")[0];

  switch (o.status) {
    case "PLACED": {
      const left = approvalHoursLeft(o.createdAt, now);
      return (
        <div className="space-y-2 border-t border-stone-100 pt-3">
          <p className={`text-sm font-semibold ${left <= 6 ? "text-red-800" : "text-amber-900"}`}>
            Approve within {left} hour{left === 1 ? "" : "s"}, or it&apos;s cancelled automatically. The {o.quantityKg} kg are
            held for this customer until then.
          </p>
          <div className="flex flex-wrap items-start gap-2">
            <form action={approveOrder}>
              {hidden}
              <SubmitButton pendingText="Approving…">Approve</SubmitButton>
            </form>
            <CancelOrder orderId={o.id} label="Decline" question="Why are you declining?" confirm="Decline this order" />
          </div>
        </div>
      );
    }
    case "APPROVED":
      return (
        <div className="space-y-1 border-t border-stone-100 pt-3">
          <div className="flex flex-wrap items-start gap-2">
            <Link href={`/seller/inspection/${o.id}`} className={ui.buttonSecondary}>
              AI check
            </Link>
            {o.boxes[0]?.qrCode && (
              <Link href={`/seller/qr/${o.id}`} className={ui.buttonSecondary}>
                QR label
              </Link>
            )}
            <form action={packOrder}>
              {hidden}
              <SubmitButton pendingText="Saving…">Mark packed</SubmitButton>
            </form>
            <CancelOrder orderId={o.id} />
          </div>
          {o.approvedAt && (
            <p className="text-xs text-stone-500">
              Approved {dateLabel(o.approvedAt)}, {timeLabel(o.approvedAt)}
            </p>
          )}
        </div>
      );
    case "PACKED":
      return (
        <div className="space-y-1 border-t border-stone-100 pt-3">
          <div className="flex flex-wrap items-start gap-2">
            <form action={dispatchOrder}>
              {hidden}
              <SubmitButton pendingText="Saving…">Mark dispatched</SubmitButton>
            </form>
            {o.boxes[0]?.qrCode && (
              <Link href={`/seller/qr/${o.id}`} className={ui.buttonSecondary}>
                QR label
              </Link>
            )}
          </div>
          {o.packedAt && (
            <p className="text-xs text-stone-500">
              Packed {dateLabel(o.packedAt)}, {timeLabel(o.packedAt)}
            </p>
          )}
        </div>
      );
    case "DISPATCHED": {
      const overdue = o.dispatchedAt !== null && now.getTime() - o.dispatchedAt.getTime() >= CONFIRM_FALLBACK_DAYS * DAY_MS;
      return (
        <div className="space-y-2 border-t border-stone-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-stone-700">
              {o.dispatchedAt ? `Sent ${dateLabel(o.dispatchedAt)}, ${timeLabel(o.dispatchedAt)}. ` : ""}
              Waiting for {first} to confirm they got it.
            </p>
            {o.boxes[0]?.qrCode && (
              <Link href={`/seller/qr/${o.id}`} className={ui.buttonSecondary}>
                QR label
              </Link>
            )}
          </div>
          {overdue && (
            <form action={markDelivered} className="space-y-2">
              {hidden}
              <p className="text-xs text-stone-500">
                No confirmation after {CONFIRM_FALLBACK_DAYS} days. If you delivered it and took the cash, mark it delivered.
              </p>
              <SubmitButton pendingText="Saving…" className={ui.buttonSecondary}>
                Mark delivered
              </SubmitButton>
            </form>
          )}
        </div>
      );
    }
    case "DELIVERED":
      return (
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 text-sm text-stone-700">
          <span>Delivered{o.deliveredAt ? ` ${dateLabel(o.deliveredAt)}` : ""}</span>
          {o.review ? (
            <>
              <Stars rating={o.review.rating} />
              {o.review.comment && <span className="text-stone-600">&ldquo;{o.review.comment}&rdquo;</span>}
            </>
          ) : (
            <span className="text-stone-500">· no review yet</span>
          )}
        </div>
      );
    case "CANCELLED":
      return (
        <p className="border-t border-stone-100 pt-3 text-sm text-stone-600">
          Cancelled{o.cancelledAt ? ` ${dateLabel(o.cancelledAt)}` : ""}
          {o.cancelReason ? `: ${o.cancelReason}` : ""}
        </p>
      );
  }
}