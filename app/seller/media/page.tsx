import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateLabel, durationLabel, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { deleteOrchardVideo } from "./actions";
import { OrchardVideoUploader, type OrchardOption } from "./video-uploader";

export default function SellerOrchardMediaPage({
  searchParams,
}: PageProps<"/seller/media">) {
  return (
    <main className="max-w-4xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Orchard media</h1>
        <p className="text-sm text-stone-600">
          Upload short harvest and orchard videos for your customers, or remove ones you no longer want to show.
        </p>
      </div>
      <Suspense fallback={<p className="text-stone-500">Loading orchard media…</p>}>
        <MediaContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function sizeLabel(bytes: number | null) {
  if (!bytes) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function MediaContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(["SELLER"]);
  await connection();
  const sp = await searchParams;
  const initialOrchardId = typeof sp.orchard === "string" ? sp.orchard : undefined;

  const [orchards, videos] = await Promise.all([
    prisma.orchard.findMany({
      where: { sellerId: user.id },
      orderBy: { name: "asc" },
      include: {
        batches: {
          orderBy: { harvestDate: "desc" },
          take: 15,
          include: { variety: { select: { name: true } } },
        },
      },
    }),
    prisma.harvestVideo.findMany({
      where: { orchard: { sellerId: user.id } },
      orderBy: { recordedAt: "desc" },
      include: {
        orchard: { select: { id: true, name: true } },
        batch: { select: { id: true, harvestDate: true, variety: { select: { name: true } } } },
      },
    }),
  ]);

  if (orchards.length === 0) {
    return (
      <div className={`${ui.card} space-y-3`}>
        <p className="font-semibold text-stone-900">Create an orchard first</p>
        <p className="text-sm text-stone-600">
          You need at least one orchard profile before you can upload harvest videos.
        </p>
        <Link href="/seller/orchards/new" className={ui.button}>
          Create your orchard
        </Link>
      </div>
    );
  }

  const orchardOptions: OrchardOption[] = orchards.map((o) => ({
    id: o.id,
    name: o.name,
    batches: o.batches.map((b) => ({
      id: b.id,
      label: `${b.variety.name} · ${dateLabel(b.harvestDate)} (${Math.floor(b.availableKg)} kg left)`,
    })),
  }));

  return (
    <div className="space-y-6">
      <OrchardVideoUploader orchards={orchardOptions} initialOrchardId={initialOrchardId} />

      <section aria-labelledby="uploaded-videos" className="space-y-3">
        <h2 id="uploaded-videos" className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Your orchard videos ({videos.length})
        </h2>

        {videos.length === 0 ? (
          <div className={`${ui.card} text-sm text-stone-600`}>
            No orchard videos uploaded yet. Use the form above to upload your first orchard video.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {videos.map((v) => (
              <li key={v.id} className={`${ui.card} flex flex-col justify-between gap-3`}>
                <div className="space-y-3">
                  <video
                    src={v.url}
                    poster={v.posterUrl ?? undefined}
                    controls
                    playsInline
                    preload="none"
                    aria-label={v.title ?? "Orchard video"}
                    className="aspect-video w-full rounded-xl bg-stone-900 object-cover"
                  />

                  <div className="space-y-1.5">
                    {v.batch && (
                      <span className="inline-block rounded-full bg-mango-soft px-2.5 py-0.5 text-xs font-semibold text-mango-ink">
                        {v.batch.variety.name}
                      </span>
                    )}

                    <p className="font-bold text-stone-900">{v.title ?? "Orchard harvest video"}</p>
                    <p className="text-sm text-stone-600">
                      {v.orchard.name} · uploaded {dateLabel(v.recordedAt)}, {timeLabel(v.recordedAt)}
                    </p>
                    {(v.durationSec || v.sizeBytes) && (
                      <p className="text-xs text-stone-500">
                        {[v.durationSec ? `Length ${durationLabel(v.durationSec)}` : null, sizeLabel(v.sizeBytes)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                  <Link href={`/customer/orchards/${v.orchardId}`} className={`${ui.link} text-sm`}>
                    View orchard page
                  </Link>
                  <form action={deleteOrchardVideo}>
                    <input type="hidden" name="id" value={v.id} />
                    <SubmitButton
                      pendingText="Removing…"
                      className={`${ui.buttonSecondary} min-h-10 border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50`}
                    >
                      Remove video
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}