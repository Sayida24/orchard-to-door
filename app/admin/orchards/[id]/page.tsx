import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";
import { deleteOrchard } from "../actions";
import { OrchardForm } from "../orchard-form";

export default function EditOrchardPage({ params }: PageProps<"/admin/orchards/[id]">) {
  return (
    <main className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">Edit orchard</h1>
      {/* params is request data for unknown ids, so it resolves inside the boundary */}
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <EditOrchard params={params} />
      </Suspense>
    </main>
  );
}

async function EditOrchard({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const [orchard, sellers] = await Promise.all([
    prisma.orchard.findUnique({ where: { id }, include: { _count: { select: { batches: true } } } }),
    prisma.user.findMany({
      where: { role: "SELLER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
  ]);
  if (!orchard) notFound();

  const batches = orchard._count.batches;
  return (
    <div className="space-y-6">
      <OrchardForm orchard={orchard} sellers={sellers} />

      <form action={deleteOrchard} className={`${ui.card} border-red-200`}>
        <input type="hidden" name="id" value={orchard.id} />
        <p className="font-medium text-red-700">Delete orchard</p>
        <p className="mb-3 mt-1 text-sm text-stone-600">
          {batches > 0
            ? `This orchard has ${batches} batch${batches === 1 ? "" : "es"}, so it can't be deleted.`
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
