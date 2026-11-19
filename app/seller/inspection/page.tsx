import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { parseStoredAi, summaryLine } from "@/lib/inspection";
import { prisma } from "@/lib/prisma";
import { dateLabel, orderNumber } from "@/lib/shop";
import { ui } from "@/lib/ui";

export default function InspectionListPage() {
  return (
    <main>
      <h1 className="text-2xl font-bold">AI inspection</h1>
      <p className="mb-4 text-sm text-stone-600">
        Before packing, record each box. The AI checks every mango, and the customer sees the video with the results.
      </p>
      <Suspense fallback={<p className="text-stone-500">Loading orders…</p>}>
        <OrdersToCheck />
      </Suspense>
    </main>
  );
}

async function OrdersToCheck() {
  const user = await requireUser(["SELLER"]);
  const orders = await prisma.order.findMany({
    where: { batch: { sellerId: user.id }, status: { in: ["APPROVED", "PACKED"] } },
    orderBy: { createdAt: "asc" },
    include: {
      customer: { select: { name: true } },
      batch: { select: { variety: { select: { name: true } } } },
      boxes: { orderBy: { createdAt: "desc" }, take: 1, select: { aiDetections: true } },
    },
  });

  if (orders.length === 0) {
    return (
      <p className={`${ui.card} text-stone-600`}>
        No orders to check. Approved orders appear here until they&apos;re sent.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => {
        const ai = parseStoredAi(o.boxes[0]?.aiDetections);
        return (
          <li key={o.id}>
            <Link
              href={`/seller/inspection/${o.id}`}
              className={`${ui.card} flex flex-wrap items-center justify-between gap-3 hover:border-[#CFC7B5]`}
            >
              <span>
                <span className="block font-semibold">
                  #{orderNumber(o.id)} · {o.quantityKg} kg {o.batch.variety.name}
                </span>
                <span className="block text-sm text-stone-600">
                  {o.customer.name.split(" ")[0]} · approved {o.approvedAt ? dateLabel(o.approvedAt) : ""}
                  {o.status === "PACKED" ? " · packed" : ""}
                </span>
                <span className="block text-sm text-stone-700">
                  {ai ? `AI: ${summaryLine(ai.summary)}` : "Not checked yet"}
                </span>
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  !ai ? "bg-stone-100 text-stone-700" : ai.summary.diseased ? "bg-mango-soft text-mango-ink" : "bg-leaf-soft text-leaf"
                }`}
              >
                {!ai ? "Check now" : ai.summary.diseased ? "Warning" : "All healthy"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
