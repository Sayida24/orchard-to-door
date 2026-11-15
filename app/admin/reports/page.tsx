import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, taka, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { DecideForm } from "./decide-form";

const RESOLVED_LABEL = { REFUND: "Refund", REPLACEMENT: "Replacement" } as const;

// FR-21 / FR-25: customer problem reports, newest open ones first.
export default function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Problem reports</h1>
      <Suspense fallback={<p className="text-stone-500">Loading reports…</p>}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Reports({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(["ADMIN"]);
  const showResolved = (await searchParams).show === "resolved";

  const [openCount, reports] = await Promise.all([
    prisma.complaint.count({ where: { status: "OPEN" } }),
    prisma.complaint.findMany({
      where: showResolved ? { status: { not: "OPEN" } } : { status: "OPEN" },
      orderBy: showResolved ? { resolvedAt: "desc" } : { createdAt: "asc" },
      take: 50,
      include: {
        customer: { select: { name: true, phone: true } },
        order: {
          select: {
            id: true,
            quantityKg: true,
            totalPrice: true,
            status: true,
            batch: { select: { variety: { select: { name: true } }, orchard: { select: { name: true } }, seller: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const tab = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold ${active ? "bg-stone-900 text-white" : "bg-white text-stone-700 border border-stone-300 hover:bg-stone-50"}`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Link href="/admin/reports" className={tab(!showResolved)}>
          Open ({openCount})
        </Link>
        <Link href="/admin/reports?show=resolved" className={tab(showResolved)}>
          Decided
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className={`${ui.card} text-stone-600`}>
          {showResolved ? "No decided reports yet." : "No open reports. Nothing needs a decision."}
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const o = r.order;
            return (
              <li key={r.id} className={`${ui.card} space-y-3`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-stone-900">{r.reason ?? "Problem"}</p>
                    <p className="text-sm text-stone-600">
                      Sent {dateLabel(r.createdAt)}, {timeLabel(r.createdAt)} by {r.customer.name} · {r.customer.phone}
                    </p>
                  </div>
                  {r.status !== "OPEN" && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        r.status === "APPROVED" ? "bg-green-100 text-green-900" : "bg-stone-200 text-stone-800"
                      }`}
                    >
                      {r.status === "APPROVED" && r.resolution ? `Approved: ${RESOLVED_LABEL[r.resolution]}` : "Not approved"}
                    </span>
                  )}
                </div>

                <p className="rounded-xl bg-stone-50 px-3 py-2 text-stone-800">{r.message}</p>

                <p className="text-sm text-stone-700">
                  <Link href={`/customer/orders/${o.id}`} className={ui.link}>
                    Order #{orderNumber(o.id)}
                  </Link>{" "}
                  · {o.quantityKg} kg {o.batch.variety.name} · {taka(o.totalPrice)} · {o.status.toLowerCase()}
                  <br />
                  {o.batch.orchard.name}, seller {o.batch.seller.name}
                </p>

                {r.status === "OPEN" ? (
                  <DecideForm id={r.id} />
                ) : (
                  (r.adminNote || r.resolvedAt) && (
                    <p className="border-t border-stone-100 pt-3 text-sm text-stone-600">
                      {r.adminNote && <>Note: {r.adminNote}. </>}
                      {r.resolvedAt && <>Decided {dateLabel(r.resolvedAt)}.</>}
                    </p>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
