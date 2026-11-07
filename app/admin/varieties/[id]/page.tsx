import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";
import { deleteVariety } from "../actions";
import { VarietyForm } from "../variety-form";

export default function EditVarietyPage({ params }: PageProps<"/admin/varieties/[id]">) {
  return (
    <main className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">Edit variety</h1>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <EditVariety params={params} />
      </Suspense>
    </main>
  );
}

async function EditVariety({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const variety = await prisma.variety.findUnique({
    where: { id },
    include: { _count: { select: { batches: true } } },
  });
  if (!variety) notFound();

  const batches = variety._count.batches;
  return (
    <div className="space-y-6">
      <VarietyForm variety={variety} />

      <form action={deleteVariety} className={`${ui.card} border-red-200`}>
        <input type="hidden" name="id" value={variety.id} />
        <p className="font-medium text-red-700">Delete variety</p>
        <p className="mb-3 mt-1 text-sm text-stone-600">
          {batches > 0
            ? `${batches} batch${batches === 1 ? " uses" : "es use"} this variety, so it can't be deleted.`
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
