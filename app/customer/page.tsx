import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Photo } from "@/components/photo";
import { getCurrentUser } from "@/lib/auth";
import { expireUnapprovedOrders } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { dhakaDayStart, openBatchWhere, taka } from "@/lib/shop";

export const metadata: Metadata = { title: "Orchards · Orchiva" };

const FALLBACK_COVER = "/images/orchard.png";

// Customer home (FR-02, FR-03): every orchard, with today's harvest videos
// and the mangoes it has on sale. Tap one to watch and order.
export default function CustomerHome({ searchParams }: PageProps<"/customer">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
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

  const [user, varieties, rows] = await Promise.all([
    getCurrentUser(),
    prisma.variety.findMany({
      where: { batches: { some: openBatchWhere(now) } },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.orchard.findMany({
      where: q
        ? { OR: [{ name: like }, { location: like }, { batches: { some: { variety: { name: like } } } }] }
        : undefined,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        photoUrls: true,
        batches: { where: openBatchWhere(now), select: { pricePerKg: true, variety: { select: { name: true } } } },
        _count: { select: { videos: { where: { recordedAt: { gte: today } } } } },
      },
    }),
  ]);

  const orchards = rows
    .map((o) => ({
      ...o,
      varieties: [...new Set(o.batches.map((b) => b.variety.name))],
      fromPrice: o.batches.length ? Math.min(...o.batches.map((b) => b.pricePerKg)) : null,
      videosToday: o._count.videos,
    }))
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

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        {user && <p className="text-stone-600">Hello, {user.name.split(" ")[0]}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
          Pick an orchard, watch today&apos;s harvest, then order.
        </h1>
      </div>

      <Form action="/customer" className="relative" role="search">
        <label htmlFor="q" className="sr-only">
          Search orchards or varieties
        </label>
        <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search orchards or varieties"
          className="h-12 w-full rounded-2xl border border-stone-300 bg-white pl-11 pr-4 text-base text-stone-900 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        {variety && <input type="hidden" name="variety" value={variety} />}
      </Form>

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
                    className={`inline-flex h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${
                      active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    {v.name || "All"}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-stone-900">Orchards</h2>
        <span className="text-sm text-stone-600">
          {orchards.length} {orchards.length === 1 ? "orchard" : "orchards"}
        </span>
      </div>

      {orchards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-stone-600">
          {variety ? `No orchard has ${variety} on sale right now.` : "No orchards match your search."}{" "}
          <Link href="/customer" className="font-semibold text-amber-700 hover:underline">
            Show all orchards
          </Link>
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orchards.map((o) => (
            <li key={o.id}>
              <Link
                href={`/customer/orchards/${o.id}`}
                className="block h-full overflow-hidden rounded-3xl border border-stone-200 bg-white transition hover:border-amber-400 hover:shadow-md"
              >
                <div className="relative h-44 bg-stone-200">
                  <Photo src={o.photoUrls[0] ?? FALLBACK_COVER} alt="" className="h-full w-full object-cover" />
                  {o.videosToday > 0 ? (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-green-900 px-3 py-1.5 text-xs font-bold text-white">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-green-300" />
                      {o.videosToday} {o.videosToday === 1 ? "video" : "videos"} today
                    </span>
                  ) : (
                    <span className="absolute left-3 top-3 rounded-full bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white">
                      No video today
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold leading-snug text-stone-900">{o.name}</h3>
                    {o.fromPrice !== null ? (
                      <span className="shrink-0 text-sm text-stone-600">
                        from <strong className="text-base text-stone-900">{taka(o.fromPrice)}</strong>/kg
                      </span>
                    ) : (
                      <span className="shrink-0 text-sm font-semibold text-stone-600">Sold out for now</span>
                    )}
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-stone-600">
                    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {o.location}
                  </p>
                  {o.varieties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {o.varieties.map((v) => (
                        <span key={v} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrchardsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading orchards">
      <div className="h-16 max-w-xl animate-pulse rounded-xl bg-stone-200" />
      <div className="h-12 animate-pulse rounded-2xl bg-stone-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-3xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
