import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { OrderStatus } from "@prisma/client";
import { Stars } from "@/components/stars";
import { requireUser } from "@/lib/auth";
import { syncOrchardVideoWarnings } from "@/lib/orchard-videos";
import { expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { DAY_MS, dateLabel, openBatchWhere, taka, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";

export default function SellerHome() {
  return (
    <main>
      <Suspense fallback={<p className="text-stone-500">Loading your dashboard…</p>}>
        <Overview />
      </Suspense>
    </main>
  );
}

// The seller's to-do list: orders to pack and send, approved refunds or new boxes,
// what's on sale, and the latest notifications.
async function Overview() {
  const user = await requireUser(["SELLER"]);
  await connection();
  await expireUnapprovedOrders();
  const videoWarnings = await syncOrchardVideoWarnings(user.id);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const mine = { batch: { sellerId: user.id } };

  const [orchards, byStatus, toFinish, onSale, week, ratings, notes] = await Promise.all([
    prisma.orchard.findMany({
      where: { sellerId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.order.groupBy({ by: ["status"], where: mine, _count: { _all: true } }),
    prisma.complaint.count({ where: { status: "APPROVED", completedAt: null, order: mine } }),
    prisma.batch.findMany({ where: { sellerId: user.id, ...openBatchWhere(now) }, select: { availableKg: true } }),
    prisma.order.aggregate({
      where: { ...mine, status: "DELIVERED", deliveredAt: { gte: weekAgo } },
      _count: { _all: true },
      _sum: { totalPrice: true },
    }),
    prisma.review.aggregate({ where: { orchard: { sellerId: user.id } }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const count = (s: OrderStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const kgOnSale = Math.floor(onSale.reduce((n, b) => n + b.availableKg, 0));
  const paused = orchards.filter((o) => !o.isActive);

  const cards = [
    {
      href: "/seller/orders",
      title: "To approve",
      value: count("PLACED"),
      note: "within 24 hours",
      alert: count("PLACED") > 0,
    },
    { href: "/seller/orders?show=approved", title: "To pack", value: count("APPROVED"), note: "approved orders", alert: false },
    { href: "/seller/orders?show=packed", title: "To dispatch", value: count("PACKED"), note: "packed, not sent", alert: false },
    { href: "/seller/orders?show=dispatched", title: "On the way", value: count("DISPATCHED"), note: "with customers soon", alert: false },
    {
      href: "/seller/orders",
      title: "Refunds & new boxes",
      value: toFinish,
      note: toFinish ? "approved, still to do" : "nothing to do",
      alert: toFinish > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-stone-600">{orchards.map((o) => o.name).join(" · ") || "No orchard yet"}</p>
      </div>

      {orchards.length === 0 && (
        <div className={`${ui.card} space-y-3`}>
          <p className="font-semibold">Welcome! Start by creating your orchard profile.</p>
          <p className="text-sm text-stone-600">
            Add your orchard&apos;s name, location and a photo. Then list your harvest batches and customers can order.
          </p>
          <Link href="/seller/orchards/new" className={ui.button}>
            Create your orchard
          </Link>
        </div>
      )}
      {paused.map((o) => (
        <p key={o.id} role="status" className="rounded-2xl border border-stone-400 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">
          An admin paused {o.name}. Customers can&apos;t order from it until it&apos;s resumed. Orders already placed carry on.
        </p>
      ))}
      {videoWarnings.map((w) => (
        <div
          key={w.orchardId}
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <span>
            <strong>{w.orchardName}</strong> has {w.count} videos and the oldest is over 1 month old. Please remove old
            videos when you can (you can still upload new ones).
          </span>
          <Link href={`/seller/media?orchard=${w.orchardId}`} className="font-semibold underline underline-offset-2">
            Manage videos →
          </Link>
        </div>
      ))}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.title}>
            <Link
              href={c.href}
              className={`${ui.card} block h-full hover:border-amber-400 ${c.alert ? "border-red-300 bg-red-50" : ""}`}
            >
              <p className="text-sm text-stone-600">{c.title}</p>
              <p className="mt-1 text-3xl font-bold">{c.value}</p>
              <p className={`text-xs ${c.alert ? "font-semibold text-red-800" : "text-stone-500"}`}>{c.note}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/seller/batches" className="rounded-2xl border border-stone-200 bg-stone-50 p-4 hover:border-amber-400">
          <p className="text-xs text-stone-600">On sale now</p>
          <p className="mt-1 text-xl font-bold text-stone-900">{kgOnSale} kg</p>
          <p className="text-xs text-stone-500">
            in {onSale.length} batch{onSale.length === 1 ? "" : "es"}
          </p>
        </Link>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-xs text-stone-600">Delivered, last 7 days</p>
          <p className="mt-1 text-xl font-bold text-stone-900">{taka(week._sum.totalPrice ?? 0)}</p>
          <p className="text-xs text-stone-500">
            {week._count._all} order{week._count._all === 1 ? "" : "s"}, cash on delivery
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-xs text-stone-600">Customer rating</p>
          {ratings._avg.rating !== null ? (
            <>
              <p className="mt-1 flex items-center gap-2 text-xl font-bold text-stone-900">
                {ratings._avg.rating.toFixed(1)} <Stars rating={ratings._avg.rating} />
              </p>
              <p className="text-xs text-stone-500">
                {ratings._count._all} review{ratings._count._all === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-stone-600">No reviews yet</p>
          )}
        </div>
      </div>

      <section aria-labelledby="latest" className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 id="latest" className="font-semibold">
            Latest notifications
          </h2>
          <Link href="/notifications" className={`${ui.link} text-sm`}>
            See all
          </Link>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-stone-600">Nothing yet. New orders and reviews show up here.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
            {notes.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <p className={`text-sm ${n.isRead ? "text-stone-700" : "font-semibold text-stone-900"}`}>{n.message}</p>
                <p className="text-xs text-stone-500">
                  {dateLabel(n.createdAt)}, {timeLabel(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}