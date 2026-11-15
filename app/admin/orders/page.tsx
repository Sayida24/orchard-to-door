import Link from "next/link";
import { Suspense } from "react";
import { OrderStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, taka } from "@/lib/shop";
import { ui } from "@/lib/ui";

const PILL: Record<OrderStatus, string> = {
  PLACED: "bg-amber-100 text-amber-900",
  PACKED: "bg-sky-100 text-sky-900",
  DISPATCHED: "bg-violet-100 text-violet-900",
  DELIVERED: "bg-green-100 text-green-900",
  CANCELLED: "bg-stone-200 text-stone-700",
};

const label = (s: OrderStatus) => s.charAt(0) + s.slice(1).toLowerCase();

// All orders across sellers, filterable by status. Each opens the order's status page.
export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Orders</h1>
      <Suspense fallback={<p className="text-stone-500">Loading orders…</p>}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(["ADMIN"]);
  const raw = (await searchParams).status;
  const status = Object.values(OrderStatus).find((s) => s === raw);

  const [counts, orders] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        customer: { select: { name: true } },
        deliveryArea: { select: { name: true } },
        batch: { select: { variety: { select: { name: true } }, orchard: { select: { name: true } } } },
        _count: { select: { complaints: { where: { status: "OPEN" } } } },
      },
    }),
  ]);
  const countOf = (s: OrderStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + c._count, 0);

  const tab = (active: boolean) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
      active ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
    }`;

  return (
    <div className="space-y-4">
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filter by status">
        <Link href="/admin/orders" className={tab(!status)}>
          All ({total})
        </Link>
        {Object.values(OrderStatus).map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={tab(status === s)}>
            {label(s)} ({countOf(s)})
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className={`${ui.card} text-stone-600`}>No orders here yet.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/customer/orders/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-stone-200 bg-white p-4 hover:border-amber-400"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">
                    #{orderNumber(o.id)} · {o.quantityKg} kg {o.batch.variety.name}
                    {o.isGiftBox && <span className="ml-2 text-xs font-medium text-amber-800">Gift box</span>}
                  </p>
                  <p className="truncate text-sm text-stone-600">
                    {o.customer.name} · {o.deliveryArea?.name ?? "No area"} · {o.batch.orchard.name} · {dateLabel(o.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {o._count.complaints > 0 && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">Open report</span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PILL[o.status]}`}>{label(o.status)}</span>
                  <span className="font-bold text-stone-900">{taka(o.totalPrice)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
