import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NO_QUALITY_DATA, orchardQuality } from "@/lib/quality";
import { ui } from "@/lib/ui";

export default function OrchardsPage() {
  return (
    <main>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orchards</h1>
        <Link href="/admin/orchards/new" className={`${ui.button} px-4 py-2 text-sm`}>
          + New orchard
        </Link>
      </div>
      <Suspense fallback={<p className="text-stone-500">Loading orchards…</p>}>
        <OrchardList />
      </Suspense>
    </main>
  );
}

async function OrchardList() {
  await requireUser(["ADMIN"]);
  await connection();
  const [orchards, quality] = await Promise.all([
    prisma.orchard.findMany({
      orderBy: { name: "asc" },
      include: { seller: { select: { name: true } }, _count: { select: { batches: true } } },
    }),
    orchardQuality(new Date()),
  ]);

  if (orchards.length === 0) {
    return <p className={`${ui.card} text-stone-600`}>No orchards yet. Create the first one.</p>;
  }

  // Orchards that need attention first, then the rest by name.
  const rows = orchards
    .map((o) => ({ ...o, q: quality.get(o.id) ?? NO_QUALITY_DATA }))
    .sort((a, b) => Number(b.q.flagged) - Number(a.q.flagged));

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {rows.map((o) => (
        <li key={o.id}>
          <Link
            href={`/admin/orchards/${o.id}`}
            className={`${ui.card} block h-full space-y-1 hover:border-amber-400 ${o.q.flagged ? "border-red-300" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{o.name}</p>
              {!o.isActive && <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs font-bold text-white">Paused</span>}
              {o.q.flagged && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Needs attention</span>
              )}
            </div>
            <p className="text-sm text-stone-600">{o.location}</p>
            <p className="text-xs text-stone-500">
              Seller: {o.seller.name} · {o._count.batches} batch{o._count.batches === 1 ? "" : "es"}
            </p>
            <p className="pt-1 text-sm text-stone-800">
              {o.q.rating !== null ? `★ ${o.q.rating.toFixed(1)} (${o.q.reviews})` : "No reviews yet"}
              {" · "}
              {o.q.open + o.q.approved + o.q.rejected === 0
                ? "no problem reports"
                : `Reports: ${o.q.open} open, ${o.q.approved} approved, ${o.q.rejected} not approved`}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
