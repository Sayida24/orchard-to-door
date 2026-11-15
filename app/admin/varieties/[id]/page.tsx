import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { MONTHS } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { dateLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { RenameForm } from "../rename-form";

export default function VarietyPage({ params }: PageProps<"/admin/varieties/[id]">) {
  return (
    <main className="max-w-xl">
      <Link href="/admin/varieties" className={`${ui.link} mb-3 inline-block text-sm`}>
        All varieties
      </Link>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <Variety params={params} />
      </Suspense>
    </main>
  );
}

async function Variety({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const variety = await prisma.variety.findUnique({
    where: { id },
    include: { addedBy: { select: { name: true } }, _count: { select: { batches: true } } },
  });
  if (!variety) notFound();

  const facts = [
    {
      label: "Season",
      value: variety.seasonStart && variety.seasonEnd ? `${MONTHS[variety.seasonStart - 1]} – ${MONTHS[variety.seasonEnd - 1]}` : "Not given",
    },
    { label: "Taste", value: variety.taste ?? "Not given" },
    { label: "Best for", value: variety.bestUse ?? "Not given" },
    { label: "Added by", value: variety.addedBy ? `${variety.addedBy.name}, ${dateLabel(variety.createdAt)}` : "Sample data" },
    { label: "Used in", value: `${variety._count.batches} batch${variety._count.batches === 1 ? "" : "es"}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{variety.name}</h1>

      <dl className={`${ui.card} grid gap-3 sm:grid-cols-2`}>
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-xs text-stone-500">{f.label}</dt>
            <dd className="text-stone-900">{f.value}</dd>
          </div>
        ))}
        <p className="text-xs text-stone-500 sm:col-span-2">The seller who added it looks after these details.</p>
      </dl>

      <section className="space-y-3" aria-labelledby="rename">
        <h2 id="rename" className="font-semibold">
          Correct the name
        </h2>
        <RenameForm id={variety.id} current={variety.name} />
      </section>
    </div>
  );
}
