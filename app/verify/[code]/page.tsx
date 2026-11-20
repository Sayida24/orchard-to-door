import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { OrderStatus } from "@prisma/client";
import { AiResultView } from "@/components/ai-result";
import { Photo } from "@/components/photo";
import { ORDER_STATUS } from "@/app/customer/orders/status";
import { getCurrentUser } from "@/lib/auth";
import { parseStoredAi, summaryLine } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";
import { dateLabel, dayLabel, MONTHS, orderNumber, timeLabel } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Box verification · Orchiva",
  description: "Verified orchard origin, harvest details, and AI box inspection results.",
};

const card = "rounded-3xl border border-line bg-white p-5";
const h2 = "font-display text-[21px] font-semibold text-ink";

export default function VerifyBoxPage({ params }: PageProps<"/verify/[code]">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-14 pt-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-line" aria-label="Verifying box" />}>
        <VerifyContent params={params} />
      </Suspense>
    </main>
  );
}

async function VerifyContent({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  const decoded = decodeURIComponent(code).trim();

  const [user, box] = await Promise.all([
    getCurrentUser(),
    prisma.box.findFirst({
      where: { qrCode: { equals: decoded, mode: "insensitive" } },
      include: {
        order: {
          select: {
            id: true,
            customerId: true,
            quantityKg: true,
            isGiftBox: true,
            status: true,
            createdAt: true,
            approvedAt: true,
            packedAt: true,
            dispatchedAt: true,
            deliveredAt: true,
            batch: {
              select: {
                harvestDate: true,
                variety: {
                  select: {
                    name: true,
                    taste: true,
                    bestUse: true,
                    seasonStart: true,
                    seasonEnd: true,
                  },
                },
                orchard: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                    photoUrls: true,
                  },
                },
                seller: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!box || !box.order) {
    return (
      <div className={`${card} space-y-4 text-center`}>
        <p className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
          <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </p>
        <h1 className="font-display text-2xl font-semibold text-ink">Verification code not found</h1>
        <p className="text-sm text-muted">
          We couldn&apos;t find a packed box matching <span className="font-mono font-bold text-ink">{decoded}</span>.
          Check the code printed below the QR label and try again.
        </p>
        <Link
          href="/verify"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-mango px-5 py-2.5 text-sm font-bold text-ink hover:bg-mango-dark"
        >
          Try another code
        </Link>
      </div>
    );
  }

  // Record this verification scan
  const updated = await prisma.box.update({
    where: { id: box.id },
    data: { scanCount: { increment: 1 } },
    select: { scanCount: true },
  });

  const order = box.order;
  const now = new Date();
  const num = orderNumber(order.id);
  const aiCheck = parseStoredAi(box.aiDetections);
  const sellerFirst = order.batch.seller.name.split(" ")[0];
  const variety = order.batch.variety;
  const orchard = order.batch.orchard;
  const status = ORDER_STATUS[order.status];
  const isOwner = user?.id === order.customerId;

  const journey: { status: OrderStatus; title: string; at: Date | null }[] = [
    { status: "PLACED", title: "Order placed", at: order.createdAt },
    { status: "APPROVED", title: "Approved by seller", at: order.approvedAt },
    { status: "PACKED", title: "Packed & AI-checked", at: order.packedAt ?? box.aiCheckedAt },
    { status: "DISPATCHED", title: "Dispatched from orchard", at: order.dispatchedAt },
    { status: "DELIVERED", title: "Delivered", at: order.deliveredAt },
  ];
  const reached = journey.findIndex((j) => j.status === order.status);

  return (
    <div className="space-y-4">
      {/* Verified Banner */}
      <section className="space-y-3 rounded-3xl border border-leaf/25 bg-leaf p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-leaf-soft">
            <svg aria-hidden="true" className="h-4 w-4 text-[#9BE29B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Verified Orchiva Box
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            Scan #{updated.scanCount}
          </span>
        </div>

        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {order.quantityKg} kg {variety.name}
          </h1>
          <p className="mt-1 text-sm text-leaf-soft">
            Order #{num} · Code <span className="font-mono font-bold text-white">{box.qrCode}</span>
            {order.isGiftBox ? " · Gift box" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.tone}`}>{status.label}</span>
          {aiCheck && (
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-ink">
              {aiCheck.summary.diseased === 0
                ? `AI check: ${aiCheck.summary.healthy} healthy`
                : `AI check: ${summaryLine(aiCheck.summary)}`}
            </span>
          )}
        </div>
      </section>

      {isOwner && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#F2D9A6] bg-mango-soft px-4 py-3 text-sm">
          <span className="font-semibold text-mango-ink">This is your order.</span>
          <Link href={`/customer/orders/${order.id}`} className="font-bold text-leaf underline underline-offset-2">
            Open order &amp; confirm delivery →
          </Link>
        </div>
      )}

      {/* AI Quality Inspection Results */}
      <section className={`${card} space-y-3`} aria-labelledby="ai-quality">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ai-quality" className={h2}>
            AI quality inspection
          </h2>
          {box.aiCheckedAt && (
            <span className="text-xs text-muted">
              Checked {dateLabel(box.aiCheckedAt)}, {timeLabel(box.aiCheckedAt)}
            </span>
          )}
        </div>
        {aiCheck ? (
          <>
            <p className="text-sm text-muted">
              {sellerFirst} recorded this exact box while packing, and our AI checked every visible mango.
            </p>
            <AiResultView data={aiCheck} />
          </>
        ) : (
          <p className="text-sm text-muted">This box hasn&apos;t completed AI inspection yet.</p>
        )}
      </section>

      {/* Orchard & Mango Details */}
      <section className={`${card} space-y-4`} aria-labelledby="origin">
        <h2 id="origin" className={h2}>
          Orchard &amp; mango details
        </h2>
        <Link
          href={`/customer/orchards/${orchard.id}`}
          className="flex items-center gap-3.5 rounded-2xl border border-line bg-cream/60 p-3 transition hover:border-[#CFC7B5]"
        >
          <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-line">
            <Photo src={orchard.photoUrls[0] ?? "/images/orchard.png"} alt={orchard.name} className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">{orchard.name}</span>
            <span className="block text-xs text-muted">
              {orchard.location} · run by {sellerFirst}
            </span>
            <span className="mt-1 inline-block text-xs font-semibold text-leaf">View orchard &amp; harvest videos →</span>
          </span>
        </Link>

        <dl className="grid gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Variety</dt>
            <dd className="font-semibold text-ink">{variety.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Harvested</dt>
            <dd className="font-semibold text-ink">
              Picked {dayLabel(order.batch.harvestDate, now)} ({dateLabel(order.batch.harvestDate)})
            </dd>
          </div>
          {variety.taste && (
            <div>
              <dt className="text-xs text-muted">Taste profile</dt>
              <dd className="text-ink">{variety.taste}</dd>
            </div>
          )}
          {variety.bestUse && (
            <div>
              <dt className="text-xs text-muted">Best for</dt>
              <dd className="text-ink">{variety.bestUse}</dd>
            </div>
          )}
          {variety.seasonStart && variety.seasonEnd && (
            <div>
              <dt className="text-xs text-muted">Peak season</dt>
              <dd className="text-ink">
                {MONTHS[variety.seasonStart - 1]} – {MONTHS[variety.seasonEnd - 1]}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Parcel Journey */}
      {order.status !== "CANCELLED" && (
        <section className={`${card} space-y-3`} aria-labelledby="journey">
          <h2 id="journey" className={h2}>
            Parcel journey
          </h2>
          <ol>
            {journey.map((step, i) => {
              const done = i <= reached || step.at !== null;
              return (
                <li key={step.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        done ? "bg-leaf text-white" : "border-2 border-[#D6CEBC] bg-white"
                      }`}
                    >
                      {done && (
                        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    {i < journey.length - 1 && (
                      <span aria-hidden="true" className={`min-h-4 w-0.5 flex-1 ${done ? "bg-leaf" : "bg-line"}`} />
                    )}
                  </div>
                  <div className={i < journey.length - 1 ? "pb-3" : ""}>
                    <p className={`text-sm ${done ? "font-semibold text-ink" : "text-muted"}`}>{step.title}</p>
                    {step.at && (
                      <p className="text-xs text-muted">
                        {dateLabel(step.at)}, {timeLabel(step.at)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/customer"
          className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-white px-4 font-semibold text-ink hover:bg-cream"
        >
          Browse orchards
        </Link>
        <Link
          href="/verify"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-line bg-white px-4 font-semibold text-ink hover:bg-cream"
        >
          Verify another code
        </Link>
      </div>
    </div>
  );
}