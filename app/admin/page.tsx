import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orchardQuality } from "@/lib/quality";
import { DAY_MS, openBatchWhere } from "@/lib/shop";
import { ui } from "@/lib/ui";

export default function AdminHome() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Overview</h1>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <Overview />
      </Suspense>
    </main>
  );
}

// The admin runs the platform, not the shops: orders stay with each seller,
// so the admin sees order numbers only as totals.
async function Overview() {
  await requireUser(["ADMIN"]);
  await connection();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [openReports, orchards, paused, quality, users, sellers, varieties, areas, ordersWeek, deliveredWeek, selling] =
    await Promise.all([
      prisma.complaint.count({ where: { status: "OPEN" } }),
      prisma.orchard.count(),
      prisma.orchard.count({ where: { isActive: false } }),
      orchardQuality(now),
      prisma.user.count(),
      prisma.user.count({ where: { role: "SELLER" } }),
      prisma.variety.count(),
      prisma.deliveryArea.count({ where: { isActive: true } }),
      prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.order.count({ where: { deliveredAt: { gte: weekAgo } } }),
      prisma.orchard.count({ where: { batches: { some: openBatchWhere(now) } } }),
    ]);
  const flagged = [...quality.values()].filter((q) => q.flagged).length;

  const cards = [
    {
      href: "/admin/reports",
      title: "Problem reports",
      value: openReports,
      note: openReports ? "need a decision" : "all decided",
      alert: openReports > 0,
    },
    {
      href: "/admin/orchards",
      title: "Orchards",
      value: orchards,
      note: [flagged ? `${flagged} need${flagged === 1 ? "s" : ""} attention` : "", paused ? `${paused} paused` : ""]
        .filter(Boolean)
        .join(" · ") || "all good",
      alert: flagged > 0,
    },
    { href: "/admin/users", title: "Users", value: users, note: `${sellers} seller${sellers === 1 ? "" : "s"}`, alert: false },
    { href: "/admin/varieties", title: "Varieties", value: varieties, note: "added by sellers", alert: false },
    { href: "/admin/delivery-areas", title: "Delivery areas", value: areas, note: "active", alert: false },
  ];

  const stats = [
    { label: "Orders placed", sub: "last 7 days", value: ordersWeek },
    { label: "Delivered", sub: "last 7 days", value: deliveredWeek },
    { label: "Orchards selling", sub: "right now", value: selling },
  ];

  return (
    <div className="space-y-8">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
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

      <section aria-labelledby="glance">
        <h2 id="glance" className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Platform at a glance
        </h2>
        <p className="mb-3 text-xs text-stone-500">Totals only. Each order&apos;s details stay with its seller.</p>
        <dl className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-xs text-stone-600">
                {s.label} <span className="block text-stone-500">{s.sub}</span>
              </dt>
              <dd className="mt-1 text-2xl font-bold text-stone-900">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
