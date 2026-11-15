import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Photo } from "@/components/photo";
import { Stars } from "@/components/stars";
import { expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { DAY_MS, dateLabel, dayLabel, dhakaDayStart, durationLabel, MONTHS, openBatchWhere, taka, timeLabel } from "@/lib/shop";
import { HarvestVideos, type VideoItem } from "./harvest-videos";

export const metadata: Metadata = { title: "Orchard · Orchiva" };

// Orchard page (FR-03, FR-07): today's harvest videos, the mangoes on sale
// with the seller's price per kg, and the way in to ordering.
export default function OrchardPage({ params }: PageProps<"/customer/orchards/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl pb-10">
      <div className="px-4 pt-3">
        <Link href="/customer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-stone-800 hover:text-amber-700">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          All orchards
        </Link>
      </div>
      <Suspense fallback={<div className="mx-4 mt-3 h-96 animate-pulse rounded-3xl bg-stone-200" aria-label="Loading orchard" />}>
        <OrchardDetail params={params} />
      </Suspense>
    </main>
  );
}

async function OrchardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection(); // "today's videos" depends on the request time, so never prerender this part
  await expireUnapprovedOrders(); // kg held by orders nobody approved in 24 hours go back on sale
  const now = new Date();
  const today = dhakaDayStart(now);
  const weekAgo = new Date(today.getTime() - 6 * DAY_MS);

  const [orchard, ratings] = await Promise.all([
    prisma.orchard.findUnique({
      where: { id },
      include: {
        seller: { select: { name: true } },
        batches: { where: openBatchWhere(now), orderBy: { harvestDate: "desc" }, include: { variety: true } },
        videos: { where: { recordedAt: { gte: weekAgo } }, orderBy: { recordedAt: "desc" } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            customer: { select: { name: true } },
            order: { select: { quantityKg: true, batch: { select: { variety: { select: { name: true } } } } } },
          },
        },
      },
    }),
    prisma.review.aggregate({ where: { orchardId: id }, _avg: { rating: true }, _count: true }),
  ]);
  if (!orchard) notFound();
  const avgRating = ratings._avg.rating;

  const sellerFirst = orchard.seller.name.split(" ")[0];
  const toItem = (v: (typeof orchard.videos)[number], withDay: boolean): VideoItem => ({
    id: v.id,
    url: v.url,
    posterUrl: v.posterUrl,
    title: v.title ?? "Harvest video",
    meta: [withDay ? dayLabel(v.recordedAt, now) : null, timeLabel(v.recordedAt), durationLabel(v.durationSec)]
      .filter(Boolean)
      .join(" · "),
  });
  const todays = orchard.videos.filter((v) => v.recordedAt >= today).map((v) => toItem(v, false));
  const earlier = orchard.videos.filter((v) => v.recordedAt < today).map((v) => toItem(v, true));
  const varieties = [...new Map(orchard.batches.map((b) => [b.variety.id, b.variety])).values()];

  return (
    <div className="space-y-6">
      <div className="mt-2 h-48 bg-stone-200 sm:mx-4 sm:h-64 sm:overflow-hidden sm:rounded-3xl">
        <Photo src={orchard.photoUrls[0] ?? "/images/orchard.png"} alt={`${orchard.name}`} className="h-full w-full object-cover" />
      </div>

      <section className="space-y-2 px-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">{orchard.name}</h1>
        <p className="flex items-center gap-1.5 text-stone-600">
          <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {orchard.location} · Run by {sellerFirst}
        </p>
        {avgRating !== null && (
          <a href="#reviews" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800 hover:text-amber-700">
            <Stars rating={avgRating} />
            {avgRating.toFixed(1)} · {ratings._count} {ratings._count === 1 ? "review" : "reviews"}
          </a>
        )}
        {varieties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {varieties.map((v) => (
              <span key={v.id} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                {v.name}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 px-4" aria-labelledby="today">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="today" className="text-xl font-bold text-stone-900">
            Today&apos;s harvest
          </h2>
          {todays.length > 0 && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-800">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-green-600" />
              {todays.length} {todays.length === 1 ? "video" : "videos"} uploaded today
            </span>
          )}
        </div>
        {todays.length > 0 ? (
          <HarvestVideos videos={todays} label="Today's harvest" />
        ) : (
          <p className="rounded-2xl border border-dashed border-stone-300 p-5 text-stone-600">
            {sellerFirst} hasn&apos;t uploaded a video today yet.
            {earlier.length > 0 ? " Watch this week's videos below." : ""}
          </p>
        )}
        {earlier.length > 0 && (
          <details className="group rounded-2xl border border-stone-200 bg-white">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-stone-900">
              Earlier this week ({earlier.length})
              <svg aria-hidden="true" className="h-5 w-5 transition group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </summary>
            <div className="px-4 pb-4">
              <HarvestVideos videos={earlier} label="Earlier harvest" />
            </div>
          </details>
        )}
      </section>

      <section className="space-y-3 px-4" aria-labelledby="available">
        <div>
          <h2 id="available" className="text-xl font-bold text-stone-900">
            Available from this orchard
          </h2>
          <p className="text-sm text-stone-600">Prices per kg, set by {sellerFirst}. Order any amount.</p>
        </div>
        {orchard.batches.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-5 text-stone-600">
            {orchard.isActive
              ? "Nothing on sale right now. Check back after the next harvest."
              : "This orchard isn't taking orders right now."}
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {orchard.batches.map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <strong className="text-base text-stone-900">{b.variety.name}</strong>
                      <span className="font-bold text-stone-900">
                        {taka(b.pricePerKg)}
                        <span className="text-xs font-medium text-stone-600">/kg</span>
                      </span>
                    </div>
                    <p className="text-sm text-stone-600">
                      Picked {dayLabel(b.harvestDate, now)} · {Math.floor(b.availableKg)} kg left
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.round((b.availableKg / b.totalKg) * 100)}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href={`/customer/orchards/${orchard.id}/order`}
              className="flex h-13 min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-500 text-base font-bold text-stone-900 hover:bg-amber-400"
            >
              Order from this orchard
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </>
        )}
      </section>

      <section id="reviews" className="space-y-3 px-4" aria-labelledby="reviews-title">
        <h2 id="reviews-title" className="text-xl font-bold text-stone-900">
          Customer reviews
        </h2>
        {orchard.reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-5 text-stone-600">
            No reviews yet. Customers can rate their mangoes after delivery.
          </p>
        ) : (
          <ul className="space-y-3">
            {orchard.reviews.map((r) => (
              <li key={r.id} className="space-y-1 rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-stone-500">{dateLabel(r.createdAt)}</span>
                </div>
                {r.comment && <p className="text-stone-800">{r.comment}</p>}
                <p className="text-sm text-stone-600">
                  {r.customer.name.split(" ")[0]} · {r.order.quantityKg} kg {r.order.batch.variety.name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(orchard.description || varieties.length > 0) && (
        <section className="mx-4 space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="font-bold text-stone-900">About this orchard</h2>
          {orchard.description && <p className="leading-relaxed text-stone-700">{orchard.description}</p>}
          {varieties.some((v) => v.seasonStart && v.seasonEnd) && (
            <dl className="grid grid-cols-2 gap-2">
              {varieties
                .filter((v) => v.seasonStart && v.seasonEnd)
                .map((v) => (
                  <div key={v.id} className="rounded-xl bg-stone-50 px-3 py-2">
                    <dt className="text-xs text-stone-600">{v.name} season</dt>
                    <dd className="text-sm font-semibold text-stone-900">
                      {MONTHS[v.seasonStart! - 1]} – {MONTHS[v.seasonEnd! - 1]}
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </section>
      )}
    </div>
  );
}
