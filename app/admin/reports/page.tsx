import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { ReportPhotos } from "@/components/report-photos";
import { requireUser } from "@/lib/auth";
import { parseStoredAi, summaryLine } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";
import { NO_QUALITY_DATA, orchardQuality } from "@/lib/quality";
import { DAY_MS, dateLabel, orderNumber, taka, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";

const RESOLVED_LABEL = { REFUND: "Refund", REPLACEMENT: "New box" } as const;
const firstName = (name: string) => name.split(" ")[0];
const daysText = (ms: number) => {
  const days = Math.floor(ms / DAY_MS);
  return days < 1 ? "within a day" : `${days} day${days === 1 ? "" : "s"}`;
};

// FR-21 / FR-25: customers' problem reports, for oversight. Each seller decides on reports
// about their own orders; the admin sees every report, its photos and the seller's decision,
// but not the customer's address or phone: those stay with the seller.
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
  await connection();
  const now = new Date();
  const sp = await searchParams;
  const decided = sp.show === "decided";
  const orchardId = typeof sp.orchard === "string" && sp.orchard ? sp.orchard : undefined;

  const inTab: Prisma.ComplaintWhereInput = decided ? { status: { in: ["APPROVED", "REJECTED"] } } : { status: "OPEN" };
  const [openCount, withReports, selected, reports, quality] = await Promise.all([
    prisma.complaint.count({ where: { status: "OPEN" } }),
    // Orchards with reports in this tab, for the filter buttons.
    prisma.orchard.findMany({
      where: { batches: { some: { orders: { some: { complaints: { some: inTab } } } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    orchardId ? prisma.orchard.findUnique({ where: { id: orchardId }, select: { id: true, name: true } }) : null,
    prisma.complaint.findMany({
      where: { ...inTab, ...(orchardId ? { order: { batch: { orchardId } } } : {}) },
      orderBy: decided ? { resolvedAt: "desc" } : { createdAt: "asc" },
      take: 50,
      include: {
        customer: { select: { name: true } },
        order: {
          select: {
            id: true,
            quantityKg: true,
            pricePerKg: true,
            totalPrice: true,
            isGiftBox: true,
            status: true,
            deliveredAt: true,
            boxes: { where: { aiCheckedAt: { not: null } }, orderBy: { aiCheckedAt: "desc" }, take: 1, select: { aiDetections: true } },
            batch: {
              select: {
                variety: { select: { name: true } },
                orchard: { select: { id: true, name: true } },
                seller: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    orchardQuality(now),
  ]);

  const orchardChips = selected && !withReports.some((o) => o.id === selected.id) ? [...withReports, selected] : withReports;
  const href = (showDecided: boolean, orchard?: string) => {
    const q = new URLSearchParams();
    if (showDecided) q.set("show", "decided");
    if (orchard) q.set("orchard", orchard);
    const s = q.toString();
    return s ? `/admin/reports?${s}` : "/admin/reports";
  };
  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
      active ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Link href={href(false, orchardId)} className={chip(!decided)}>
          Waiting for seller ({openCount})
        </Link>
        <Link href={href(true, orchardId)} className={chip(decided)}>
          Decided
        </Link>
      </div>

      {orchardChips.length > 0 && (
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filter by orchard">
          <Link href={href(decided)} className={chip(!orchardId)}>
            All orchards
          </Link>
          {orchardChips.map((o) => (
            <Link key={o.id} href={href(decided, o.id)} className={chip(orchardId === o.id)}>
              {o.name}
            </Link>
          ))}
        </nav>
      )}

      {reports.length === 0 ? (
        <p className={`${ui.card} text-stone-600`}>
          {decided ? "No decided reports here yet." : "No reports are waiting for a seller."}
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const o = r.order;
            const orchard = o.batch.orchard;
            const q = quality.get(orchard.id) ?? NO_QUALITY_DATA;
            const ai = parseStoredAi(o.boxes[0]?.aiDetections);
            return (
              <li key={r.id} className={`${ui.card} space-y-3`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-stone-900">{r.reason ?? "Problem"}</p>
                    <p className="text-sm text-stone-600">
                      From {firstName(r.customer.name)} · {dateLabel(r.createdAt)}, {timeLabel(r.createdAt)}
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
                <ReportPhotos urls={r.photoUrls} />

                <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-stone-500">What they bought</dt>
                    <dd className="text-stone-800">
                      {o.quantityKg} kg {o.batch.variety.name} × {taka(o.pricePerKg)}
                      {o.isGiftBox ? ", gift box" : ""} · {taka(o.totalPrice)} total
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">Order</dt>
                    <dd className="text-stone-800">
                      #{orderNumber(o.id)} · {o.status.toLowerCase()}
                      {o.deliveredAt ? ` ${dateLabel(o.deliveredAt)}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">Orchard</dt>
                    <dd className="text-stone-800">
                      <Link href={`/admin/orchards/${orchard.id}`} className={ui.link}>
                        {orchard.name}
                      </Link>
                      , run by {o.batch.seller.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">This orchard&apos;s record</dt>
                    <dd className="text-stone-800">
                      {q.rating !== null ? `★ ${q.rating.toFixed(1)} (${q.reviews}) · ` : ""}
                      {q.approved} approved, {q.rejected} not approved
                      {q.flagged && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Needs attention</span>
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-stone-500">AI check at packing</dt>
                    <dd className="text-stone-800">
                      {ai ? (
                        <>
                          {summaryLine(ai.summary)} ·{" "}
                          <a href={ai.mediaUrl} target="_blank" rel="noopener noreferrer" className={ui.link}>
                            {ai.kind === "video" ? "watch the packing video" : "see the packing photo"}
                          </a>
                        </>
                      ) : (
                        "Not checked"
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-1 border-t border-stone-100 pt-3 text-sm text-stone-700">
                  {r.status === "OPEN" ? (
                    <p className="font-semibold text-amber-900">
                      Waiting for {firstName(o.batch.seller.name)} to decide · reported {daysText(now.getTime() - r.createdAt.getTime())} ago
                    </p>
                  ) : (
                    <>
                      <p>
                        <span className="font-semibold text-stone-900">{firstName(o.batch.seller.name)}&apos;s decision</span>
                        {r.resolvedAt ? `, ${dateLabel(r.resolvedAt)} (took ${daysText(r.resolvedAt.getTime() - r.createdAt.getTime())})` : ""}
                        {r.adminNote ? `: “${r.adminNote}”` : ""}
                      </p>
                      {r.status === "APPROVED" && (
                        <p className={r.completedAt ? "text-green-800" : "font-semibold text-amber-900"}>
                          {r.completedAt
                            ? `${r.resolution === "REFUND" ? "Money returned" : "New box sent"} ${dateLabel(r.completedAt)}`
                            : `${r.resolution === "REFUND" ? "Refund" : "New box"} not done yet`}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
