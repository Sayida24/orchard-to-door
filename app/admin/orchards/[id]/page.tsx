import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { flagReason, NO_QUALITY_DATA, orchardQuality } from "@/lib/quality";
import { ui } from "@/lib/ui";
import { deleteOrchard, setOrchardActive } from "../actions";
import { OrchardForm } from "../orchard-form";

export default function OrchardAdminPage({ params }: PageProps<"/admin/orchards/[id]">) {
  return (
    <main className="max-w-xl">
      {/* params is request data for unknown ids, so it resolves inside the boundary */}
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <OrchardAdmin params={params} />
      </Suspense>
    </main>
  );
}

async function OrchardAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  await connection();
  const { id } = await params;
  const [orchard, sellers, quality] = await Promise.all([
    prisma.orchard.findUnique({ where: { id }, include: { _count: { select: { batches: true } } } }),
    prisma.user.findMany({
      where: { role: "SELLER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    orchardQuality(new Date(), id),
  ]);
  if (!orchard) notFound();

  const q = quality.get(id) ?? NO_QUALITY_DATA;
  const batches = orchard._count.batches;
  const stats = [
    { label: "Rating", value: q.rating !== null ? `★ ${q.rating.toFixed(1)}` : "–", sub: `${q.reviews} review${q.reviews === 1 ? "" : "s"}` },
    { label: "Open reports", value: q.open, sub: "waiting" },
    { label: "Approved", value: q.approved, sub: "refund or new box" },
    { label: "Not approved", value: q.rejected, sub: "turned down" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{orchard.name}</h1>
        {!orchard.isActive && <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-xs font-bold text-white">Paused</span>}
        {q.flagged && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">Needs attention</span>}
      </div>

      <section className={`${ui.card} space-y-3`} aria-labelledby="quality">
        <h2 id="quality" className="font-semibold">
          Quality
        </h2>
        {q.flagged && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{flagReason(q)}</p>}
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-stone-50 px-3 py-2">
              <dt className="text-xs text-stone-600">{s.label}</dt>
              <dd className="text-xl font-bold text-stone-900">{s.value}</dd>
              <dd className="text-xs text-stone-500">{s.sub}</dd>
            </div>
          ))}
        </dl>
        {q.reasons.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-stone-600">What customers reported</p>
            <ul className="flex flex-wrap gap-1.5">
              {q.reasons.map(([reason, n]) => (
                <li key={reason} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                  {reason} ×{n}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href={`/admin/reports?orchard=${id}`} className={ui.link}>
            Open reports
          </Link>
          <Link href={`/admin/reports?show=decided&orchard=${id}`} className={ui.link}>
            Decided reports
          </Link>
        </p>
      </section>

      <form action={setOrchardActive} className={`${ui.card} space-y-3 ${orchard.isActive ? "" : "border-stone-400 bg-stone-50"}`}>
        <input type="hidden" name="id" value={orchard.id} />
        <input type="hidden" name="active" value={orchard.isActive ? "0" : "1"} />
        <div>
          <p className="font-semibold">{orchard.isActive ? "Pause this orchard" : "This orchard is paused"}</p>
          <p className="mt-1 text-sm text-stone-600">
            {orchard.isActive
              ? "Customers won't be able to order from it. Orders already placed carry on. The seller is notified."
              : "Customers can't order from it. Resume to put its mangoes back on sale. The seller is notified."}
          </p>
        </div>
        <SubmitButton
          pendingText={orchard.isActive ? "Pausing…" : "Resuming…"}
          className={orchard.isActive ? ui.buttonSecondary : ui.button}
        >
          {orchard.isActive ? "Pause orchard" : "Resume orchard"}
        </SubmitButton>
      </form>

      <section className="space-y-3" aria-labelledby="details">
        <h2 id="details" className="font-semibold">
          Details
        </h2>
        <OrchardForm orchard={orchard} sellers={sellers} />
      </section>

      <form action={deleteOrchard} className={`${ui.card} border-red-200`}>
        <input type="hidden" name="id" value={orchard.id} />
        <p className="font-medium text-red-700">Delete orchard</p>
        <p className="mb-3 mt-1 text-sm text-stone-600">
          {batches > 0
            ? `This orchard has ${batches} batch${batches === 1 ? "" : "es"}, so it can't be deleted. Pause it instead.`
            : "This can't be undone."}
        </p>
        <SubmitButton
          disabled={batches > 0}
          pendingText="Deleting…"
          className={`${ui.buttonSecondary} border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50`}
        >
          Delete
        </SubmitButton>
      </form>
    </div>
  );
}
