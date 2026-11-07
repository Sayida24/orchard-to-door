import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";
import { deleteArea, toggleArea } from "./actions";
import { AreaForm } from "./area-forms";

export default function DeliveryAreasPage() {
  return (
    <main className="max-w-3xl">
      <h1 className="text-2xl font-bold">Delivery areas</h1>
      <p className="mb-4 text-sm text-stone-600">
        Customers pick one of the active areas at checkout and pay its delivery fee.
      </p>
      <Suspense fallback={<p className="text-stone-500">Loading areas…</p>}>
        <AreaList />
      </Suspense>
    </main>
  );
}

const linkButton = "min-h-11 px-2 text-sm font-medium underline-offset-2 hover:underline disabled:opacity-40";

async function AreaList() {
  await requireUser(["ADMIN"]);
  const areas = await prisma.deliveryArea.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-4">
      <div className={ui.card}>
        <p className="mb-2 text-sm font-medium text-stone-700">Add an area</p>
        <AreaForm />
      </div>

      <ul className="space-y-2">
        {areas.map((a) => (
          <li
            key={a.id}
            className={`${ui.card} flex flex-col gap-2 p-4 sm:flex-row sm:items-start ${a.isActive ? "" : "bg-stone-50"}`}
          >
            <AreaForm area={a} />
            <div className="flex items-center gap-1 sm:pt-0">
              {!a.isActive && (
                <span className="mr-1 rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">hidden</span>
              )}
              <form action={toggleArea}>
                <input type="hidden" name="id" value={a.id} />
                <SubmitButton pendingText="…" className={`${linkButton} text-stone-700`}>
                  {a.isActive ? "Hide" : "Show"}
                </SubmitButton>
              </form>
              <form action={deleteArea}>
                <input type="hidden" name="id" value={a.id} />
                <SubmitButton
                  pendingText="…"
                  disabled={a._count.orders > 0}
                  className={`${linkButton} text-red-700`}
                >
                  Delete
                </SubmitButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {areas.some((a) => a._count.orders > 0) && (
        <p className="text-xs text-stone-500">Areas used by past orders can&apos;t be deleted. Hide them instead.</p>
      )}
    </div>
  );
}
