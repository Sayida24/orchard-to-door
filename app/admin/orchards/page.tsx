import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const orchards = await prisma.orchard.findMany({
    orderBy: { name: "asc" },
    include: { seller: { select: { name: true } }, _count: { select: { batches: true } } },
  });

  if (orchards.length === 0) {
    return <p className={`${ui.card} text-stone-600`}>No orchards yet. Create the first one.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {orchards.map((o) => (
        <li key={o.id}>
          <Link href={`/admin/orchards/${o.id}`} className={`${ui.card} block h-full hover:border-amber-400`}>
            <p className="font-semibold">{o.name}</p>
            <p className="text-sm text-stone-600">📍 {o.location}</p>
            <p className="mt-2 text-xs text-stone-500">
              Seller: {o.seller.name} · {o._count.batches} batch{o._count.batches === 1 ? "" : "es"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
