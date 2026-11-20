import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { QrLabelCard } from "@/components/qr-label-card";
import { requireUser } from "@/lib/auth";
import { parseStoredAi, summaryLine } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";
import { dateLabel, dayLabel, orderNumber, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";

export default function OrderQrPage({ params }: PageProps<"/seller/qr/[orderId]">) {
  return (
    <main className="max-w-2xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/seller/qr" className={`${ui.link} text-sm`}>
          ← All QR labels
        </Link>
        <Link href="/seller/orders" className={`${ui.link} text-sm`}>
          Orders &amp; packing
        </Link>
      </div>
      <Suspense fallback={<p className="text-stone-500">Loading QR label…</p>}>
        <OrderQrDetail params={params} />
      </Suspense>
    </main>
  );
}

async function OrderQrDetail({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser(["SELLER"]);
  await connection();
  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, batch: { sellerId: user.id } },
    include: {
      customer: { select: { name: true } },
      batch: {
        select: {
          harvestDate: true,
          variety: { select: { name: true } },
          orchard: { select: { name: true, location: true } },
          seller: { select: { name: true } },
        },
      },
      boxes: {
        where: { aiCheckedAt: { not: null } },
        orderBy: { aiCheckedAt: "desc" },
        take: 1,
        select: {
          qrCode: true,
          scanCount: true,
          aiCheckedAt: true,
          aiDetections: true,
        },
      },
    },
  });
  if (!order) notFound();

  const box = order.boxes[0];
  const ai = parseStoredAi(box?.aiDetections);
  const now = new Date();
  const num = orderNumber(order.id);

  if (!box || !ai || !box.aiCheckedAt) {
    return (
      <div className={`${ui.card} space-y-3`}>
        <h1 className="text-xl font-bold text-stone-900">QR code not generated yet · Order #{num}</h1>
        <p className="text-sm text-stone-600">
          Each order gets its unique verification QR code right after it is AI inspected. Run the AI inspection for{" "}
          {order.quantityKg} kg {order.batch.variety.name} first.
        </p>
        <Link href={`/seller/inspection/${order.id}`} className={`${ui.button} inline-flex`}>
          Run AI inspection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Box QR label · Order #{num}</h1>
          <p className="text-sm text-stone-600">
            For {order.customer.name.split(" ")[0]} · {order.quantityKg} kg {order.batch.variety.name} ·{" "}
            {order.status.toLowerCase()}
          </p>
        </div>
        <Link href={`/verify/${encodeURIComponent(box.qrCode)}`} className={ui.buttonSecondary}>
          Preview customer scan page
        </Link>
      </div>

      <QrLabelCard
        qrCode={box.qrCode}
        orderNum={num}
        variety={order.batch.variety.name}
        quantityKg={order.quantityKg}
        isGiftBox={order.isGiftBox}
        orchardName={order.batch.orchard.name}
        orchardLocation={order.batch.orchard.location}
        sellerFirst={order.batch.seller.name.split(" ")[0]}
        pickedLabel={dayLabel(order.batch.harvestDate, now)}
        checkedAtLabel={`${dateLabel(box.aiCheckedAt)}, ${timeLabel(box.aiCheckedAt)}`}
        aiSummaryText={summaryLine(ai.summary)}
        totalMangoes={ai.summary.total}
        healthyCount={ai.summary.healthy}
        diseasedCount={ai.summary.diseased}
        scanCount={box.scanCount}
      />
    </div>
  );
}