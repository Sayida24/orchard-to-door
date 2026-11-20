import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";
import { deleteOrchard } from "../actions";
import { OrchardProfileForm } from "../orchard-form";

export default function SellerOrchardPage({ params, searchParams }: PageProps<"/seller/orchards/[id]">) {
  return (
    <main className="max-w-xl">
      <Link href="/seller/orchards" className={`${ui.link} mb-3 inline-block text-sm`}>
        My orchards
      </Link>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <SellerOrchard params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SellerOrchard({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(["SELLER"]);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const orchard = await prisma.orchard.findFirst({
    where: { id, sellerId: user.id },
    include: { _count: { select: { batches: true } } },
  });
  if (!orchard) notFound();
  const batches = orchard._count.batches;

  return (
    <div className="space-y-6">
      {sp.saved === "new" && (
        <div role="status" className="space-y-2 rounded-2xl bg-green-50 px-4 py-3">
          <p className="font-semibold text-green-900">Your orchard is ready.</p>
          <p className="text-sm text-green-900">Customers see it as soon as you list a harvest batch.</p>
          <Link href="/seller/batches/new" className={`${ui.button} px-4 py-2 text-sm`}>
            List a batch
          </Link>
        </div>
      )}
      {sp.saved === "1" && (
        <p role="status" className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
          Saved.
        </p>
      )}
      {!orchard.isActive && (
        <p role="status" className="rounded-2xl border border-stone-400 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">
          An admin paused this orchard. Customers can&apos;t order from it until it&apos;s resumed.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{orchard.name}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/seller/media?orchard=${orchard.id}`} className={`${ui.link} text-sm`}>
            Orchard videos
          </Link>
          <Link href={`/customer/orchards/${orchard.id}`} className={`${ui.link} text-sm`}>
            See it as customers do
          </Link>
        </div>
      </div>

      {/* Remounts after a new cover is saved, so the picked photo isn't uploaded twice */}
      <OrchardProfileForm key={orchard.photoUrls[0] ?? "no-photo"} orchard={orchard} />

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