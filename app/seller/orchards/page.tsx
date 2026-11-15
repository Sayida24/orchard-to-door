import Link from "next/link";
import { Suspense } from "react";
import { Photo } from "@/components/photo";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";

export default function MyOrchardsPage() {
  return (
    <main>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My orchards</h1>
        <Link href="/seller/orchards/new" className={`${ui.button} px-4 py-2 text-sm`}>
          + New orchard
        </Link>
      </div>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <OrchardList />
      </Suspense>
    </main>
  );
}

async function OrchardList() {
  const user = await requireUser(["SELLER"]);
  const orchards = await prisma.orchard.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { batches: true } } },
  });

  if (orchards.length === 0) {
    return (
      <div className={`${ui.card} space-y-3`}>
        <p className="font-semibold">Create your orchard profile</p>
        <p className="text-sm text-stone-600">
          Add your orchard&apos;s name, location and a photo. Customers see it on your orchard&apos;s card. Then list your
          harvest batches.
        </p>
        <Link href="/seller/orchards/new" className={ui.button}>
          Create your orchard
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {orchards.map((o) => (
        <li key={o.id}>
          <Link
            href={`/seller/orchards/${o.id}`}
            className={`${ui.card} block h-full space-y-1 overflow-hidden hover:border-amber-400`}
          >
            <div className="-mx-5 -mt-5 mb-3 h-36 bg-stone-200">
              {o.photoUrls[0] ? (
                <Photo src={o.photoUrls[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <p className="flex h-full items-center justify-center text-sm font-semibold text-stone-600">
                  No photo yet: open to add one
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{o.name}</p>
              {!o.isActive && (
                <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs font-bold text-white">Paused by admin</span>
              )}
            </div>
            <p className="text-sm text-stone-600">{o.location}</p>
            <p className="text-xs text-stone-500">
              {o._count.batches} batch{o._count.batches === 1 ? "" : "es"} listed
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
