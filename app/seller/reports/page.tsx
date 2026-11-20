import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { ReportPhotos } from "@/components/report-photos";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { parseStoredAi, summaryLine } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, taka, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { completeReport } from "./actions";
import { DecideForm } from "./decide-form";

const TABS: { key: string; label: string; where: Prisma.ComplaintWhereInput }[] = [
  { key: "decide", label: "To decide", where: { status: "OPEN" } },
  { key: "finish", label: "To finish", where: { status: "APPROVED", completedAt: null } },
  { key: "done", label: "Done", where: { OR: [{ status: "REJECTED" }, { status: "APPROVED", completedAt: { not: null } }] } },
];

// FR-21 / FR-25: problem reports on this seller's orders. The seller decides on each one
// (refund, new box or not approved) and then carries it out. The admin sees them all.
export default function SellerReportsPage({ searchParams }: PageProps<"/seller/reports">) {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Problem reports</h1>
      <Suspense fallback={<p className="text-stone-500">Loading reports…</p>}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function loadReports(sellerId: string, where: Prisma.ComplaintWhereInput, newestFirst: boolean) {
  return prisma.complaint.findMany({
    where: { ...where, order: { batch: { sellerId } } },
    orderBy: { createdAt: newestFirst ? "desc" : "asc" },
    take: 50,
    include: {
      customer: { select: { name: true, phone: true } },
      order: {
        select: {
          id: true,
          quantityKg: true,
          totalPrice: true,
          address: true,
          landmark: true,
          deliveredAt: true,
          deliveryArea: { select: { name: true } },
          batch: { select: { variety: { select: { name: true } }, orchard: { select: { name: true } } } },
          boxes: { where: { aiCheckedAt: { not: null } }, orderBy: { aiCheckedAt: "desc" }, take: 1, select: { aiDetections: true } },
        },
      },
    },
  });
}
type Report = Awaited<ReturnType<typeof loadReports>>[number];

async function Reports({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser(["SELLER"]);
  await connection();
  const show = (await searchParams).show;
  const tab = TABS.find((t) => t.key === show) ?? TABS[0];
  const mine = { order: { batch: { sellerId: user.id } } };

  const [counts, reports] = await Promise.all([
    Promise.all(TABS.map((t) => prisma.complaint.count({ where: { ...t.where, ...mine } }))),
    loadReports(user.id, tab.where, tab.key === "done"),
  ]);

  return (
    <div className="space-y-5">
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Report steps">
        {TABS.map((t, i) => (
          <Link
            key={t.key}
            href={t.key === "decide" ? "/seller/reports" : `/seller/reports?show=${t.key}`}
            aria-current={t === tab ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
              t === tab ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {t.label} ({counts[i]})
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <p className={`${ui.card} text-stone-600`}>
          {tab.key === "decide" ? "No new reports. Nothing to decide." : tab.key === "finish" ? "Nothing to finish." : "No finished reports yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportCard({ r }: { r: Report }) {
  const o = r.order;
  const ai = parseStoredAi(o.boxes[0]?.aiDetections);
  const refund = r.resolution === "REFUND";

  return (
    <li className={`${ui.card} space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-stone-900">{r.reason ?? "Problem"}</p>
          <p className="text-sm text-stone-600">
            Order #{orderNumber(o.id)} · {o.quantityKg} kg {o.batch.variety.name} · {taka(o.totalPrice)} · {o.batch.orchard.name}
          </p>
        </div>
        <p className="text-xs text-stone-500">
          Reported {dateLabel(r.createdAt)}, {timeLabel(r.createdAt)}
        </p>
      </div>

      <p className="rounded-xl bg-stone-50 px-3 py-2 text-stone-800">{r.message}</p>
      <ReportPhotos urls={r.photoUrls} />

      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-stone-500">Customer</dt>
          <dd className="text-stone-800">
            {r.customer.name} ·{" "}
            <a href={`tel:${r.customer.phone}`} className={ui.link}>
              {r.customer.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Address</dt>
          <dd className="text-stone-800">
            {o.address}
            {o.landmark ? ` (${o.landmark})` : ""}, {o.deliveryArea?.name ?? ""}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-stone-500">AI check at packing</dt>
          <dd className="text-stone-800">
            {ai ? (
              <>
                {summaryLine(ai.summary) || "No mangoes found"} ·{" "}
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

      {r.status === "OPEN" ? (
        <DecideForm id={r.id} />
      ) : r.status === "APPROVED" && !r.completedAt ? (
        <form action={completeReport} className="space-y-2 border-t border-stone-100 pt-3">
          <input type="hidden" name="complaintId" value={r.id} />
          <p className="text-sm font-semibold text-stone-900">
            You approved: {refund ? `return ${taka(o.totalPrice)} to ${r.customer.name.split(" ")[0]}` : "send a new box"}
            {r.adminNote ? ` · “${r.adminNote}”` : ""}
          </p>
          <SubmitButton pendingText="Saving…">{refund ? "Money returned" : "New box sent"}</SubmitButton>
        </form>
      ) : (
        <p className="border-t border-stone-100 pt-3 text-sm text-stone-700">
          {r.status === "REJECTED"
            ? `Not approved${r.resolvedAt ? ` ${dateLabel(r.resolvedAt)}` : ""}${r.adminNote ? `: ${r.adminNote}` : ""}`
            : `${refund ? "Money returned" : "New box sent"}${r.completedAt ? ` ${dateLabel(r.completedAt)}` : ""}${r.adminNote ? ` · ${r.adminNote}` : ""}`}
        </p>
      )}
    </li>
  );
}
