import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

async function Overview() {
  await requireUser(["ADMIN"]);
  const [users, sellers, orchards, varieties, areas, openBatches, orders, waiting, openReports] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.orchard.count(),
    prisma.variety.count(),
    prisma.deliveryArea.count({ where: { isActive: true } }),
    prisma.batch.count({ where: { status: "OPEN" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.complaint.count({ where: { status: "OPEN" } }),
  ]);

  const cards = [
    {
      href: "/admin/reports",
      title: "Problem reports",
      value: openReports,
      note: openReports ? "need a decision" : "all decided",
      urgent: openReports > 0,
    },
    { href: "/admin/orders", title: "Orders", value: orders, note: `${waiting} waiting to be packed` },
    { href: "/admin/users", title: "Users", value: users, note: `${sellers} seller${sellers === 1 ? "" : "s"}` },
    { href: "/admin/orchards", title: "Orchards", value: orchards, note: `${openBatches} open batches` },
    { href: "/admin/varieties", title: "Varieties", value: varieties, note: "Mango Guide" },
    { href: "/admin/delivery-areas", title: "Delivery areas", value: areas, note: "active" },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            className={`${ui.card} block h-full hover:border-amber-400 ${"urgent" in c && c.urgent ? "border-red-300 bg-red-50" : ""}`}
          >
            <p className="text-sm text-stone-600">{c.title}</p>
            <p className="mt-1 text-3xl font-bold">{c.value}</p>
            <p className="text-xs text-stone-500">{c.note}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
