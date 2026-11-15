import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Photo } from "@/components/photo";
import { getCurrentUser } from "@/lib/auth";
import { expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { dayLabel, dhakaDayStart, durationLabel, openBatchWhere, taka, timeLabel, varietyColor } from "@/lib/shop";

export const metadata: Metadata = { title: "Orchards · Orchiva" };

const FALLBACK_COVER = "/images/orchard.png";

// Customer home (FR-02, FR-03): every orchard, with today's harvest videos
// and the mangoes it has on sale. Tap one to watch and order.
export default function CustomerHome({ searchParams }: PageProps<"/customer">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-14 pt-5 sm:pt-8">
      <Suspense fallback={<OrchardsSkeleton />}>
        <Orchards searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Orchards({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const variety = typeof sp.variety === "string" ? sp.variety : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  await connection(); // "today" depends on the request time, so never prerender this part
  await expireUnapprovedOrders(); // kg held by orders nobody approved in 24 hours go back on sale
  const now = new Date();
  const today = dhakaDayStart(now);
  const like = { contains: q, mode: "insensitive" as const };

  const [user, varieties, rows, ratings, videos] = await Promise.all([
    getCurrentUser(),
    prisma.variety.findMany({
      where: { batches: { some: openBatchWhere(now) } },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.orchard.findMany({
      // A paused orchard is hidden from customers.
      where: {
        isActive: true,
        ...(q ? { OR: [{ name: like }, { location: like }, { batches: { some: { variety: { name: like } } } }] } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        photoUrls: true,
        batches: {
          where: openBatchWhere(now),
          select: { pricePerKg: true, availableKg: true, harvestDate: true, variety: { select: { name: true } } },
        },
        _count: { select: { videos: { where: { recordedAt: { gte: today } } } } },
      },
    }),
    prisma.review.groupBy({ by: ["orchardId"], _avg: { rating: true }, _count: { _all: true } }),
    prisma.harvestVideo.findMany({
      where: { recordedAt: { gte: today }, orchard: { isActive: true } },
      orderBy: { recordedAt: "desc" },
      take: 8,
      select: { id: true, title: true, posterUrl: true, durationSec: true, recordedAt: true, orchard: { select: { id: true, name: true } } },
    }),
  ]);

  const ratingOf = new Map(ratings.map((r) => [r.orchardId, r]));
  const orchards = rows
    .map((o) => {
      const latest = o.batches.reduce<Date | null>((d, b) => (!d || b.harvestDate > d ? b.harvestDate : d), null);
      return {
        ...o,
        varieties: [...new Set(o.batches.map((b) => b.variety.name))],
        fromPrice: o.batches.length ? Math.min(...o.batches.map((b) => b.pricePerKg)) : null,
        kgLeft: Math.floor(o.batches.reduce((n, b) => n + b.availableKg, 0)),
        picked: latest ? dayLabel(latest, now) : null,
        videosToday: o._count.videos,
        rating: ratingOf.get(o.id),
      };
    })
    .filter((o) => !variety || o.varieties.includes(variety))
    // Orchards with mangoes on sale first, then the ones with fresh videos.
    .sort((a, b) => Number(b.fromPrice !== null) - Number(a.fromPrice !== null) || b.videosToday - a.videosToday);

  const chipHref = (v: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (v) params.set("variety", v);
    const s = params.toString();
    return s ? `/customer?${s}` : "/customer";
  };
  const filtering = Boolean(q || variety);
  const first = user?.name.split(" ")[0];

  return (
    <div className="space-y-9">
      <section className="space-y-5">
        <div className="space-y-2">
          {first && <p className="text-[15px] text-muted">Hello, {first}</p>}
          <h1 className="max-w-2xl font-display text-[34px] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            From the Orchard to Your Doorstep
          </h1>
        </div>

        <Form action="/customer" className="relative max-w-2xl" role="search">
          <label htmlFor="q" className="sr-only">
            Search orchards or varieties
          </label>
          <svg aria-hidden="true" className="pointer-events-none absolute left-[18px] top-1/2 h-5 w-5 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search orchards or varieties"
            className="h-14 w-full rounded-[18px] border border-line bg-white pl-12 pr-4 text-base text-ink shadow-[0_6px_18px_rgba(27,42,31,0.06)] placeholder:text-muted focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20"
          />
          {variety && <input type="hidden" name="variety" value={variety} />}
        </Form>

        <ul className="grid max-w-2xl grid-cols-3 gap-3 text-center text-xs font-medium leading-snug text-ink sm:text-sm">
          {[
            { label: "Watch today's harvest", icon: <><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></> },
            { label: "The orchard's own price", icon: <><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r="1" /></> },
            { label: "Cash on delivery", icon: <><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></> },
          ].map((t) => (
            <li key={t.label} className="flex flex-col items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-soft text-leaf">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {t.icon}
                </svg>
              </span>
              {t.label}
            </li>
          ))}
        </ul>
      </section>

      {videos.length > 0 && !filtering && (
        <section aria-labelledby="harvest" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="harvest" className="font-display text-2xl font-semibold text-ink">
              Today&apos;s harvest
            </h2>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-leaf">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#2E8B47]" />
              {videos.length} new {videos.length === 1 ? "video" : "videos"}
            </span>
          </div>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {videos.map((v) => (
              <li key={v.id} className="w-56 shrink-0 snap-start">
                <Link href={`/customer/orchards/${v.orchard.id}`} className="group block space-y-2 rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf">
                  <span className="relative block h-32 overflow-hidden rounded-[18px] bg-line">
                    {v.posterUrl && <Photo src={v.posterUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                    <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow">
                      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
                    </span>
                    {v.durationSec ? (
                      <span className="absolute bottom-2 right-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {durationLabel(v.durationSec)}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm font-semibold text-ink">{v.title ?? "Harvest video"}</span>
                  <span className="-mt-1.5 block text-xs text-muted">
                    {v.orchard.name} · {timeLabel(v.recordedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {varieties.length > 0 && (
        <nav aria-label="Filter by variety" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex gap-2">
            {[{ name: "" }, ...varieties].map((v) => {
              const active = v.name === variety;
              return (
                <li key={v.name || "all"}>
                  <Link
                    href={chipHref(v.name)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
                      active ? "bg-leaf text-white" : "border border-line bg-white text-ink hover:border-[#CFC7B5]"
                    }`}
                  >
                    {v.name && <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: varietyColor(v.name) }} />}
                    {v.name || "All"}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <section aria-labelledby="orchards" className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="orchards" className="font-display text-2xl font-semibold text-ink">
            {filtering ? (variety ? `${variety} on sale` : "Search results") : "Orchards selling today"}
          </h2>
          <span className="text-sm text-muted">
            {orchards.length} {orchards.length === 1 ? "orchard" : "orchards"}
          </span>
        </div>

        {orchards.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-[#D6CEBC] bg-white/60 p-6 text-center text-muted">
            {variety ? `No orchard has ${variety} on sale right now.` : "No orchards match your search."}{" "}
            <Link href="/customer" className="font-semibold text-leaf underline-offset-2 hover:underline">
              Show all orchards
            </Link>
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {orchards.map((o) => {
              const onSale = o.fromPrice !== null;
              return (
                <li key={o.id}>
                  <Link
                    href={`/customer/orchards/${o.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_10px_28px_rgba(27,42,31,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(27,42,31,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  >
                    <div className="relative h-48 overflow-hidden bg-line">
                      <Photo
                        src={o.photoUrls[0] ?? FALLBACK_COVER}
                        alt=""
                        className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${onSale ? "" : "opacity-85 grayscale-[0.55]"}`}
                      />
                      {o.videosToday > 0 ? (
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-leaf px-3 py-1.5 text-xs font-semibold text-white">
                          <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-[#9BE29B]" />
                          {o.videosToday} {o.videosToday === 1 ? "video" : "videos"} today
                        </span>
                      ) : (
                        <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white">No video today</span>
                      )}
                      {onSale ? (
                        <span className="absolute bottom-3 right-3 rounded-[14px] bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-[0_4px_14px_rgba(0,0,0,0.14)]">
                          from <strong className="font-display text-xl font-bold">{taka(o.fromPrice!)}</strong>/kg
                        </span>
                      ) : (
                        <span className="absolute bottom-3 right-3 rounded-[14px] bg-ink px-3 py-2 text-[13px] font-semibold text-white">Nothing on sale today</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2.5 p-4 pb-4">
                      <h3 className="font-display text-[22px] font-semibold leading-tight text-ink">{o.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-muted">
                        <span className="inline-flex items-center gap-1">
                          <svg aria-hidden="true" className="h-[15px] w-[15px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {o.location}
                        </span>
                        {o.rating?._avg.rating != null ? (
                          <span className="inline-flex items-center gap-1 text-ink">
                            <svg aria-hidden="true" className="h-[15px] w-[15px]" viewBox="0 0 24 24"><path fill="#E0890B" d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 5.11a.56.56 0 0 0 .47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.39a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.59 0l-4.73 2.88a.56.56 0 0 1-.84-.61l1.29-5.39a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .47-.35Z" /></svg>
                            <strong>{o.rating._avg.rating.toFixed(1)}</strong>
                            <span className="text-muted">({o.rating._count._all})</span>
                          </span>
                        ) : (
                          <span>No reviews yet</span>
                        )}
                      </div>
                      {o.varieties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {o.varieties.map((v) => (
                            <span key={v} className="rounded-full bg-mango-soft px-2.5 py-1 text-xs font-semibold text-mango-ink">
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#F1EBDD] pt-3">
                        <span className="text-[13px] text-muted">
                          {onSale ? `Picked ${o.picked} · ${o.kgLeft} kg left` : "Back after the next harvest"}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                            onSale ? "bg-leaf text-white group-hover:bg-leaf-dark" : "border border-line text-ink"
                          }`}
                        >
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function OrchardsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading orchards">
      <div className="h-24 max-w-xl animate-pulse rounded-2xl bg-line" />
      <div className="h-14 max-w-2xl animate-pulse rounded-[18px] bg-line" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-3xl bg-line" />
        ))}
      </div>
    </div>
  );
}
