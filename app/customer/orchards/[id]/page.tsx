import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Photo } from "@/components/photo";
import { Stars } from "@/components/stars";
import { expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import {
  DAY_MS,
  dateLabel,
  dayLabel,
  dhakaDayStart,
  durationLabel,
  MONTHS,
  openBatchWhere,
  taka,
  timeLabel,
  varietyColor,
} from "@/lib/shop";
import { HarvestVideos, type VideoItem } from "./harvest-videos";

export const metadata: Metadata = { title: "Orchard · Orchiva" };

const FALLBACK_COVER = "/images/orchard.png";

// Orchard page (FR-03, FR-07): today's harvest videos, the mangoes on sale
// with the seller's price per kg, reviews, and the way in to ordering.
export default function OrchardPage({ params }: PageProps<"/customer/orchards/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl">
      <Suspense fallback={<div className="h-[480px] animate-pulse bg-line sm:mx-4 sm:mt-4 sm:rounded-3xl" aria-label="Loading orchard" />}>
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
  const fromPrice = orchard.batches.length ? Math.min(...orchard.batches.map((b) => b.pricePerKg)) : null;
  const h2 = "font-display text-[23px] font-semibold text-ink";

  return (
    <div>
      {/* Phones: full-width photo with the details on a sheet over it. Larger screens: a 4:3 photo
          beside the details, so small or square photos aren't stretched into a blurry banner. */}
      <div className="sm:flex sm:items-end sm:gap-7 sm:px-4 sm:pt-6">
      <div className="relative h-72 bg-line sm:aspect-[4/3] sm:h-auto sm:w-[360px] sm:shrink-0 sm:overflow-hidden sm:rounded-3xl sm:shadow-[0_10px_28px_rgba(27,42,31,0.12)]">
        <Photo src={orchard.photoUrls[0] ?? FALLBACK_COVER} alt={orchard.name} className="h-full w-full object-cover" />
        <Link
          href="/customer"
          aria-label="Back to all orchards"
          className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-ink shadow hover:bg-white"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        {todays.length > 0 && (
          <span className="absolute right-4 top-6 inline-flex items-center gap-1.5 rounded-full bg-leaf px-3 py-1.5 text-xs font-semibold text-white">
            <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-[#9BE29B]" />
            {todays.length} {todays.length === 1 ? "video" : "videos"} today
          </span>
        )}
      </div>
        <section className="relative -mt-8 space-y-2.5 rounded-t-[28px] bg-cream px-5 pt-6 sm:mt-0 sm:flex-1 sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-2 sm:pt-0">
          <h1 className="font-display text-[31px] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">{orchard.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {orchard.location} · run by {sellerFirst}
          </p>
          {avgRating !== null && (
            <a href="#reviews" className="inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-ink hover:text-leaf">
              <Stars rating={avgRating} />
              {avgRating.toFixed(1)} · {ratings._count} {ratings._count === 1 ? "review" : "reviews"}
            </a>
          )}
          {varieties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {varieties.map((v) => (
                <span key={v.id} className="rounded-full bg-mango-soft px-2.5 py-1 text-xs font-semibold text-mango-ink">
                  {v.name}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-9 px-5 pb-8 pt-9 sm:px-4 sm:pt-10">
        <section className="space-y-3" aria-labelledby="today">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="today" className={h2}>
              Today&apos;s harvest
            </h2>
            {todays.length > 0 && (
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-leaf">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#2E8B47]" />
                Uploaded today
              </span>
            )}
          </div>
          {todays.length > 0 ? (
            <HarvestVideos videos={todays} label="Today's harvest" />
          ) : (
            <p className="rounded-3xl border border-dashed border-[#D6CEBC] bg-white/60 p-5 text-muted">
              {sellerFirst} hasn&apos;t uploaded a video today yet.
              {earlier.length > 0 ? " Watch this week's videos below." : ""}
            </p>
          )}
          {earlier.length > 0 && (
            <details className="group rounded-[20px] border border-line bg-white">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-ink">
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

        <section className="space-y-3" aria-labelledby="available">
          <div>
            <h2 id="available" className={h2}>
              Available now
            </h2>
            <p className="mt-1 text-sm text-muted">Prices per kg, set by {sellerFirst}. Order any amount.</p>
          </div>
          {orchard.batches.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-[#D6CEBC] bg-white/60 p-5 text-muted">
              {orchard.isActive
                ? "Nothing on sale right now. Check back after the next harvest."
                : "This orchard isn't taking orders right now."}
            </p>
          ) : (
            <ul className="space-y-3">
              {orchard.batches.map((b) => (
                <li key={b.id} className="flex items-center gap-3.5 rounded-[20px] border border-line bg-white p-3.5">
                  <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-mango-soft font-display text-xl font-bold text-mango-ink">
                    {b.variety.name.charAt(0)}
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: varietyColor(b.variety.name) }}
                    />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[17px] font-semibold text-ink">{b.variety.name}</p>
                    <p className="text-[13px] text-muted">
                      Picked {dayLabel(b.harvestDate, now)} · {Math.floor(b.availableKg)} kg left
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF3EC]">
                      <div className="h-full rounded-full bg-mango" style={{ width: `${Math.round((b.availableKg / b.totalKg) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-[23px] font-bold text-ink">{taka(b.pricePerKg)}</span>
                    <span className="block text-xs text-muted">per kg</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="reviews" className="space-y-3" aria-labelledby="reviews-title">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="reviews-title" className={h2}>
              What customers say
            </h2>
            {avgRating !== null && <span className="text-[13px] text-muted">{avgRating.toFixed(1)} average</span>}
          </div>
          {orchard.reviews.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-[#D6CEBC] bg-white/60 p-5 text-muted">
              No reviews yet. Customers can rate their mangoes after delivery.
            </p>
          ) : (
            <ul className="space-y-3">
              {orchard.reviews.map((r) => (
                <li key={r.id}>
                  <figure className="space-y-2 rounded-[20px] border border-line bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-muted">{dateLabel(r.createdAt)}</span>
                    </div>
                    {r.comment && <blockquote className="text-[15px] leading-relaxed text-ink">{r.comment}</blockquote>}
                    <figcaption className="text-[13px] text-muted">
                      {r.customer.name.split(" ")[0]} · {r.order.quantityKg} kg {r.order.batch.variety.name}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(orchard.description || varieties.some((v) => v.seasonStart && v.seasonEnd)) && (
          <section className="space-y-3 rounded-[20px] bg-leaf-soft p-5" aria-labelledby="about">
            <h2 id="about" className="font-display text-[21px] font-semibold text-ink">
              About this orchard
            </h2>
            {orchard.description && <p className="leading-relaxed text-[#22342A]">{orchard.description}</p>}
            {varieties.some((v) => v.seasonStart && v.seasonEnd) && (
              <dl className="grid grid-cols-2 gap-2.5">
                {varieties
                  .filter((v) => v.seasonStart && v.seasonEnd)
                  .map((v) => (
                    <div key={v.id} className="rounded-[14px] bg-white px-3 py-2.5">
                      <dt className="text-xs text-muted">{v.name} season</dt>
                      <dd className="text-sm font-semibold text-ink">
                        {MONTHS[v.seasonStart! - 1]} – {MONTHS[v.seasonEnd! - 1]}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
          </section>
        )}
      </div>

      {fromPrice !== null && (
        <div className="sticky bottom-0 z-10 border-t border-line bg-white/95 px-4 pb-5 pt-3 shadow-[0_-8px_24px_rgba(27,42,31,0.08)] backdrop-blur sm:mb-4 sm:rounded-3xl sm:border">
          <div className="flex items-center justify-between gap-3">
            <p className="leading-tight">
              <span className="block text-xs text-muted">from</span>
              <span className="font-display text-[23px] font-bold text-ink">{taka(fromPrice)}</span>
              <span className="text-[13px] font-medium text-muted">/kg</span>
              <span className="block text-xs text-muted">Cash on delivery</span>
            </p>
            <Link
              href={`/customer/orchards/${orchard.id}/order`}
              className="inline-flex h-14 items-center gap-2 rounded-2xl bg-mango px-6 text-base font-bold text-ink hover:bg-mango-dark"
            >
              Order now
              <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}