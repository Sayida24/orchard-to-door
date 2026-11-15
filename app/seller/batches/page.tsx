import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayLabel, lastSaleDay, taka } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { batchState } from "./batch-state";

export default function BatchesPage() {
  return (
    <main>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Harvest batches</h1>
        <Link href="/seller/batches/new" className={`${ui.button} px-4 py-2 text-sm`}>
          + List a batch
        </Link>
      </div>
      <Suspense fallback={<p className="text-stone-500">Loading batches…</p>}>
        <BatchList />
      </Suspense>
    </main>
  );
}

async function loadBatches(sellerId: string) {
  return prisma.batch.findMany({
    where: { sellerId },
    orderBy: { harvestDate: "desc" },
    take: 60,
    include: {
      variety: { select: { name: true } },
      orchard: { select: { name: true, isActive: true } },
      _count: { select: { orders: { where: { status: { not: "CANCELLED" } } } } },
    },
  });
}
type Row = Awaited<ReturnType<typeof loadBatches>>[number] & { state: ReturnType<typeof batchState> };

async function BatchList() {
  const user = await requireUser(["SELLER"]);
  await connection();
  const now = new Date();
  const rows: Row[] = (await loadBatches(user.id)).map((b) => ({ ...b, state: batchState(b, now) }));

  if (rows.length === 0) {
    return (
      <div className={`${ui.card} space-y-2`}>
        <p className="font-semibold">No batches yet</p>
        <p className="text-sm text-stone-600">
          List your first harvest: the variety, how many kg, and your price per kg. Customers can order as soon as it&apos;s
          listed.
        </p>
      </div>
    );
  }

  const current = rows.filter((b) => b.state.key !== "ended");
  const ended = rows.filter((b) => b.state.key === "ended");
  return (
    <div className="space-y-8">
      <BatchGrid title="Current" rows={current} now={now} empty="Nothing listed right now." />
      {ended.length > 0 && <BatchGrid title="Ended" rows={ended} now={now} />}
    </div>
  );
}

function BatchGrid({ title, rows, now, empty }: { title: string; rows: Row[]; now: Date; empty?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-600">{empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((b) => {
            const pct = b.totalKg > 0 ? Math.round((b.availableKg / b.totalKg) * 100) : 0;
            return (
              <li key={b.id}>
                <Link href={`/seller/batches/${b.id}`} className={`${ui.card} block h-full space-y-2 hover:border-amber-400`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{b.variety.name}</p>
                      <p className="text-xs text-stone-500">
                        {b.orchard.name} · picked {dayLabel(b.harvestDate, now)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${b.state.tone}`}>{b.state.label}</span>
                  </div>
                  <p className="text-lg font-bold">
                    {taka(b.pricePerKg)}
                    <span className="text-xs font-medium text-stone-600">/kg</span>
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-stone-600">
                    {Math.floor(b.availableKg)} of {Math.floor(b.totalKg)} kg left · {b._count.orders} order
                    {b._count.orders === 1 ? "" : "s"}
                    {b.state.key !== "ended"
                      ? b.closesAt && ` · on sale until ${lastSaleDay(b.closesAt)}`
                      : b.closesAt && b.closesAt <= now
                        ? ` · last day ${lastSaleDay(b.closesAt)}`
                        : " · stopped early"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
