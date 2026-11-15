import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayLabel, lastSaleDay, taka } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { stopSelling } from "../actions";
import { batchState } from "../batch-state";
import { PriceForm, StockForm } from "./batch-edit";

export default function ManageBatchPage({ params, searchParams }: PageProps<"/seller/batches/[id]">) {
  return (
    <main className="max-w-xl">
      <Link href="/seller/batches" className={`${ui.link} mb-3 inline-block text-sm`}>
        Harvest batches
      </Link>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <ManageBatch params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ManageBatch({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(["SELLER"]);
  await connection();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const batch = await prisma.batch.findFirst({
    where: { id, sellerId: user.id },
    include: {
      variety: { select: { name: true } },
      orchard: { select: { name: true, isActive: true } },
      orders: { where: { status: { not: "CANCELLED" } }, select: { quantityKg: true, status: true } },
    },
  });
  if (!batch) notFound();

  const now = new Date();
  const state = batchState(batch, now);
  const editable = state.key !== "ended";
  // New orders hold their kg until the seller approves them; approved ones count as sold.
  const waiting = batch.orders.filter((o) => o.status === "PLACED");
  const sold = batch.orders.filter((o) => o.status !== "PLACED");
  const kgOf = (list: { quantityKg: number }[]) => list.reduce((n, o) => n + o.quantityKg, 0);
  const orders = (n: number) => `${n} order${n === 1 ? "" : "s"}`;
  const facts = [
    { label: "Price", value: `${taka(batch.pricePerKg)}/kg` },
    { label: "Left to sell", value: `${Math.floor(batch.availableKg)} kg` },
    { label: "Waiting for approval", value: `${kgOf(waiting)} kg · ${orders(waiting.length)}` },
    { label: "Sold", value: `${kgOf(sold)} kg · ${orders(sold.length)}` },
  ];

  return (
    <div className="space-y-6">
      {sp.listed === "1" && (
        <p role="status" className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
          Listed. Customers can order {batch.variety.name} now.
        </p>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{batch.variety.name}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${state.tone}`}>{state.label}</span>
        </div>
        <p className="text-sm text-stone-600">
          {batch.orchard.name} · picked {dayLabel(batch.harvestDate, now)}
          {editable && batch.closesAt ? ` · on sale until ${lastSaleDay(batch.closesAt)}` : ""}
        </p>
      </div>

      <dl className={`${ui.card} grid grid-cols-2 gap-3 sm:grid-cols-4`}>
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-xs text-stone-500">{f.label}</dt>
            <dd className="font-bold text-stone-900">{f.value}</dd>
          </div>
        ))}
      </dl>

      {editable ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <PriceForm batchId={batch.id} price={batch.pricePerKg} />
            <StockForm batchId={batch.id} availableKg={Math.floor(batch.availableKg)} />
          </div>
          <form action={stopSelling} className={`${ui.card} space-y-2`}>
            <input type="hidden" name="batchId" value={batch.id} />
            <p className="font-semibold">Stop selling</p>
            <p className="text-sm text-stone-600">Takes this batch off sale now. Orders already placed carry on.</p>
            <SubmitButton
              pendingText="Stopping…"
              className={`${ui.buttonSecondary} border-red-300 text-red-700 hover:bg-red-50`}
            >
              Stop selling
            </SubmitButton>
          </form>
        </>
      ) : (
        <p className={`${ui.card} text-sm text-stone-600`}>
          This batch has ended, so it can&apos;t be changed.{" "}
          <Link href="/seller/batches/new" className={ui.link}>
            List a new batch
          </Link>{" "}
          to sell more.
        </p>
      )}

      <Link href="/seller/orders" className={`${ui.link} text-sm`}>
        Go to your orders
      </Link>
    </div>
  );
}
