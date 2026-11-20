import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AiResultView } from "@/components/ai-result";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { parseStoredAi } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { packOrder } from "../../orders/actions";
import { Inspector } from "./inspector";

export default function OrderInspectionPage({ params }: PageProps<"/seller/inspection/[orderId]">) {
  return (
    <main className="max-w-2xl">
      <Link href="/seller/inspection" className={`${ui.link} mb-3 inline-block text-sm`}>
        AI inspection
      </Link>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <OrderInspection params={params} />
      </Suspense>
    </main>
  );
}

async function OrderInspection({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser(["SELLER"]);
  const { orderId } = await params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, batch: { sellerId: user.id } },
    include: {
      customer: { select: { name: true } },
      batch: { select: { variety: { select: { name: true } }, orchard: { select: { name: true } } } },
      boxes: { orderBy: { createdAt: "desc" }, take: 1, select: { qrCode: true, aiDetections: true, aiCheckedAt: true } },
    },
  });
  if (!order) notFound();

  const box = order.boxes[0];
  const saved = parseStoredAi(box?.aiDetections);
  const checkedAt = box?.aiCheckedAt;
  {saved && box?.qrCode && (
        <div className={`${ui.card} flex flex-wrap items-center justify-between gap-3 border-leaf/30 bg-leaf-soft/50`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-leaf">Box QR verification</p>
            <p className="font-mono text-base font-bold text-ink">{box.qrCode}</p>
            <p className="text-xs text-muted">Print or download this QR label and place it inside or on the box.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/seller/qr/${order.id}`} className={`${ui.button} py-2 text-sm`}>
              Print / download QR
            </Link>
            <Link href={`/verify/${encodeURIComponent(box.qrCode)}`} className={ui.buttonSecondary}>
              Preview scan page
            </Link>
          </div>
        </div>
      )}
  const checkable = order.status === "APPROVED" || order.status === "PACKED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI check · order #{orderNumber(order.id)}</h1>
        <p className="text-sm text-stone-600">
          {order.quantityKg} kg {order.batch.variety.name} for {order.customer.name} · {order.batch.orchard.name} ·{" "}
          {order.status.toLowerCase()}
        </p>
      </div>

      {saved && (
        <section className="space-y-3" aria-labelledby="saved">
          <h2 id="saved" className="font-semibold">
            Saved result{checkedAt ? ` · ${dateLabel(checkedAt)}, ${timeLabel(checkedAt)}` : ""}
          </h2>
          <div className={ui.card}>
            <AiResultView data={saved} />
          </div>
        </section>
      )}

      {order.status === "APPROVED" && saved && (
        <form action={packOrder} className={`${ui.card} space-y-2`}>
          <input type="hidden" name="orderId" value={order.id} />
          <p className="font-semibold">Ready to pack?</p>
          <p className="text-sm text-stone-600">
            {saved.summary.diseased
              ? "The AI found possible disease. You can replace those mangoes and check again, or pack as it is."
              : "Every mango looks healthy."}{" "}
            The customer is told, and sees this check on their order page.
          </p>
          <SubmitButton pendingText="Saving…">Mark packed</SubmitButton>
        </form>
      )}

      {checkable ? (
        <section className="space-y-3" aria-labelledby="check">
          <h2 id="check" className="font-semibold">
            {saved ? "Check again" : "Check this box"}
          </h2>
          <Inspector orderId={order.id} />
        </section>
      ) : (
        <p className={`${ui.card} text-sm text-stone-600`}>
          {order.status === "PLACED"
            ? "Approve this order first, then check its box while packing."
            : "This order has left the orchard, so its box can't be checked again."}
        </p>
      )}
    </div>
  );
}
