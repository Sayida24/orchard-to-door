import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  dateLabel,
  durationLabel,
  ORCHARD_VIDEO_MAX_DAYS,
  timeLabel,
  videoExpiresAt,
  videoRemainingLabel,
} from "@/lib/shop";
import { ui } from "@/lib/ui";
import { deleteOrchardVideo, deleteOverdueVideos } from "./actions";
import { OrchardVideoUploader, type OrchardOption } from "./video-uploader";

export default function SellerOrchardMediaPage({
  searchParams,
}: PageProps<"/seller/media">) {
  return (
    <main className="max-w-4xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Orchard media</h1>
        <p className="text-sm text-stone-600">
          Upload short harvest and orchard videos for your customers. Every video must be removed within{" "}
          <strong>{ORCHARD_VIDEO_MAX_DAYS} days</strong> of upload.
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
  const now = new Date();

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

  const annotated = videos.map((v) => {
    const status = videoRemainingLabel(v.recordedAt, now);
    const expiresAt = videoExpiresAt(v.recordedAt);
    return { ...v, status, expiresAt };
  });

  // Show overdue videos first so the seller sees what must be removed immediately.
  const sortedVideos = [...annotated].sort(
    (a, b) => Number(b.status.overdue) - Number(a.status.overdue) || b.recordedAt.getTime() - a.recordedAt.getTime(),
  );
  const overdueVideos = sortedVideos.filter((v) => v.status.overdue);

  return (
    <div className="space-y-6">
      {overdueVideos.length > 0 && (
        <section
          role="alert"
          aria-labelledby="overdue-heading"
          className="flex flex-col gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <h2 id="overdue-heading" className="font-bold text-red-900">
              {overdueVideos.length} {overdueVideos.length === 1 ? "video is" : "videos are"} past the{" "}
              {ORCHARD_VIDEO_MAX_DAYS}-day removal deadline
            </h2>
            <p className="text-sm text-red-800">
              Expired videos are hidden from customers. Remove them now to keep your orchard media clean and unlock new
              uploads.
            </p>
          </div>
          <form action={deleteOverdueVideos} className="shrink-0">
            <SubmitButton
              pendingText="Removing…"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            >
              Remove all overdue ({overdueVideos.length})
            </SubmitButton>
          </form>
        </section>
      )}

      <OrchardVideoUploader
        orchards={orchardOptions}
        initialOrchardId={initialOrchardId}
        overdueCount={overdueVideos.length}
      />

      <section aria-labelledby="uploaded-videos" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="uploaded-videos" className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Your orchard videos ({sortedVideos.length})
          </h2>
          <p className="text-xs text-stone-500">Must be removed within {ORCHARD_VIDEO_MAX_DAYS} days of upload</p>
        </div>

        {sortedVideos.length === 0 ? (
          <div className={`${ui.card} text-sm text-stone-600`}>
            No orchard videos uploaded yet. Use the form above to upload your first orchard video.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sortedVideos.map((v) => {
              const badgeClass = v.status.overdue
                ? "bg-red-100 text-red-800"
                : v.status.urgent
                  ? "bg-amber-100 text-amber-900"
                  : "bg-leaf-soft text-leaf";

              return (
                <li
                  key={v.id}
                  className={`${ui.card} flex flex-col justify-between gap-3 ${
                    v.status.overdue ? "border-red-300 bg-red-50/40" : ""
                  }`}
                >
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
                          {v.status.label}
                        </span>
                        {v.batch && (
                          <span className="rounded-full bg-mango-soft px-2.5 py-0.5 text-xs font-semibold text-mango-ink">
                            {v.batch.variety.name}
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-stone-900">{v.title ?? "Orchard harvest video"}</p>
                      <p className="text-sm text-stone-600">
                        {v.orchard.name} · uploaded {dateLabel(v.recordedAt)}, {timeLabel(v.recordedAt)}
                      </p>
                      <p className="text-xs text-stone-500">
                        {[
                          v.durationSec ? `Length ${durationLabel(v.durationSec)}` : null,
                          sizeLabel(v.sizeBytes),
                          `Remove by ${dateLabel(v.expiresAt)}, ${timeLabel(v.expiresAt)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
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
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}