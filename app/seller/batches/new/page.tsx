import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";
import { BatchForm } from "./batch-form";

export default function NewBatchPage() {
  return (
    <main className="max-w-xl">
      <Link href="/seller/batches" className={`${ui.link} mb-3 inline-block text-sm`}>
        Harvest batches
      </Link>
      <h1 className="mb-1 text-2xl font-bold">List a harvest batch</h1>
      <p className="mb-4 text-sm text-stone-600">Customers can order as soon as you list it, at your price per kg.</p>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <NewBatch />
      </Suspense>
    </main>
  );
}

async function NewBatch() {
  const user = await requireUser(["SELLER"]);
  const [orchards, varieties] = await Promise.all([
    prisma.orchard.findMany({
      where: { sellerId: user.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.variety.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (orchards.length === 0) {
    return (
      <p className={`${ui.card} text-stone-700`}>
        You don&apos;t have an orchard that can sell right now. An admin sets up orchards, and a paused orchard can&apos;t list
        batches.
      </p>
    );
  }
  return <BatchForm orchards={orchards} varieties={varieties} />;
}
