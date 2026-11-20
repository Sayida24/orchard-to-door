import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { parseStoredAi, summaryLine } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";

export default function SellerQrListPage() {
  return (
    <main>
      <h1 className="text-2xl font-bold">QR verification</h1>
      <p className="mb-4 text-sm text-stone-600">
        Every order gets a unique QR code after AI inspection. Print or download the label and include it in the box so
        your customer can scan it on delivery.
      </p>
      <Suspense fallback={<p className="text-stone-500">Loading QR labels…</p>}>
        <QrOrdersList />
      </Suspense>
    </main>
  );
}

async function QrOrdersList() {
  const user = await requireUser(["SELLER"]);
  await connection();

  const [inspected, needsInspection] = await Promise.all([
    prisma.order.findMany({
      where: {
        batch: { sellerId: user.id },
        boxes: { some: { aiCheckedAt: { not: null } } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        customer: { select: { name: true } },
        batch: {
          select: {
            variety: { select: { name: true } },
            orchard: { select: { name: true } },
          },
        },
        boxes: {
          where: { aiCheckedAt: { not: null } },
          orderBy: { aiCheckedAt: "desc" },
          take: 1,
          select: { id: true, qrCode: true, scanCount: true, aiCheckedAt: true, aiDetections: true },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        batch: { sellerId: user.id },
        status: { in: ["APPROVED", "PACKED"] },
        boxes: { none: { aiCheckedAt: { not: null } } },
      },
      orderBy: { createdAt: "asc" },
      take: 30,
      include: {
        customer: { select: { name: true } },
        batch: {
          select: {
            variety: { select: { name: true } },
            orchard: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  if (inspected.length === 0 && needsInspection.length === 0) {
    return (
      <div className={`${ui.card} space-y-2`}>
        <p className="font-semibold text-stone-900">No box QR codes yet</p>
        <p className="text-sm text-stone-600">
          Approve an order and run the AI inspection while packing. Each order automatically gets a unique printable QR
          label once inspected.
        </p>
        <Link href="/seller/inspection" className={`${ui.button} mt-2 inline-flex`}>
          Go to AI inspection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="ready-qr">
        <h2 id="ready-qr" className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Ready to print &amp; download ({inspected.length})
        </h2>
        {inspected.length === 0 ? (
          <p className={`${ui.card} text-sm text-stone-600`}>
            No orders have been AI inspected yet. Run AI inspection on an approved order below to generate its QR label.
          </p>
        ) : (
          <ul className="space-y-3">
            {inspected.map((o) => {
              const box = o.boxes[0];
              if (!box) return null;
              const ai = parseStoredAi(box.aiDetections);
              const healthyOnly = ai ? ai.summary.diseased === 0 : true;
              return (
                <li key={o.id} className={`${ui.card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-stone-900">
                        #{orderNumber(o.id)} · {o.quantityKg} kg {o.batch.variety.name}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          healthyOnly ? "bg-leaf-soft text-leaf" : "bg-mango-soft text-mango-ink"
                        }`}
                      >
                        {ai ? (healthyOnly ? "All healthy" : "Warning") : "AI checked"}
                      </span>
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                        {o.status.toLowerCase()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600">
                      {o.customer.name.split(" ")[0]} · {o.batch.orchard.name}
                      {box.aiCheckedAt ? ` · inspected ${dateLabel(box.aiCheckedAt)}, ${timeLabel(box.aiCheckedAt)}` : ""}
                    </p>
                    {ai && <p className="text-sm text-stone-700">AI: {summaryLine(ai.summary)}</p>}
                    <p className="text-xs text-stone-500">
                      Code: <span className="font-mono font-bold text-stone-800">{box.qrCode}</span> · Scanned{" "}
                      {box.scanCount} {box.scanCount === 1 ? "time" : "times"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Link href={`/seller/qr/${o.id}`} className={`${ui.button} py-2 text-sm`}>
                      Print / download QR
                    </Link>
                    <Link href={`/verify/${encodeURIComponent(box.qrCode)}`} className={ui.buttonSecondary}>
                      Preview scan
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {needsInspection.length > 0 && (
        <section className="space-y-3" aria-labelledby="pending-qr">
          <h2 id="pending-qr" className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Waiting for AI inspection ({needsInspection.length})
          </h2>
          <ul className="space-y-2">
            {needsInspection.map((o) => (
              <li key={o.id} className={`${ui.card} flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <p className="font-semibold text-stone-900">
                    #{orderNumber(o.id)} · {o.quantityKg} kg {o.batch.variety.name}
                  </p>
                  <p className="text-sm text-stone-600">
                    {o.customer.name.split(" ")[0]} · {o.batch.orchard.name} · run AI inspection to generate this
                    order&apos;s QR code
                  </p>
                </div>
                <Link href={`/seller/inspection/${o.id}`} className={ui.buttonSecondary}>
                  Run AI inspection
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}