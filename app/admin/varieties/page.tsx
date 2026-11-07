import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { MONTHS } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";

export default function VarietiesPage() {
  return (
    <main>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Varieties</h1>
        <Link href="/admin/varieties/new" className={`${ui.button} px-4 py-2 text-sm`}>
          + New variety
        </Link>
      </div>
      <p className="mb-4 text-sm text-stone-600">These entries make up the customer-facing Mango Guide.</p>
      <Suspense fallback={<p className="text-stone-500">Loading varieties…</p>}>
        <VarietyList />
      </Suspense>
    </main>
  );
}

const short = (m: number) => MONTHS[m - 1].slice(0, 3);

async function VarietyList() {
  await requireUser(["ADMIN"]);
  const varieties = await prisma.variety.findMany({
    orderBy: [{ seasonStart: "asc" }, { name: "asc" }],
    include: { _count: { select: { batches: true } } },
  });

  if (varieties.length === 0) {
    return <p className={`${ui.card} text-stone-600`}>No varieties yet. Add the first one.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {varieties.map((v) => (
        <li key={v.id}>
          <Link href={`/admin/varieties/${v.id}`} className={`${ui.card} block h-full hover:border-amber-400`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{v.name}</p>
              {v.seasonStart && v.seasonEnd && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {short(v.seasonStart)}–{short(v.seasonEnd)}
                </span>
              )}
            </div>
            {v.taste && <p className="mt-1 text-sm text-stone-600">{v.taste}</p>}
            <p className="mt-2 text-xs text-stone-500">
              {v.bestUse ? `Best for: ${v.bestUse} · ` : ""}
              {v._count.batches} batch{v._count.batches === 1 ? "" : "es"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
