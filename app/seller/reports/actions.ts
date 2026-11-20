"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { orderNumber } from "@/lib/shop";

export type DecideState = { ok?: boolean; error?: string } | undefined;

const DECISIONS = ["REFUND", "REPLACEMENT", "REJECT"] as const;

function revalidateReport(orderId: string) {
  revalidatePath("/seller");
  revalidatePath("/seller/reports");
  revalidatePath("/seller/orders");
  revalidatePath(`/customer/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/orchards");
}

// FR-21 / FR-25: the seller decides on a problem report about one of their own orders:
// return the money, send a new box, or not approved (with a reason for the customer).
// The customer always hears the outcome; the admin sees every report and decision.
export async function decideReport(_prev: DecideState, fd: FormData): Promise<DecideState> {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "id");
  const decision = str(fd, "decision") as (typeof DECISIONS)[number];
  const note = str(fd, "note").slice(0, 500);

  if (!DECISIONS.includes(decision)) return { error: "Choose refund, new box or not approved." };
  if (decision === "REJECT" && note.length < 5) return { error: "Tell the customer why it isn't approved." };

  const report = await prisma.complaint.findFirst({
    where: { id, order: { batch: { sellerId: user.id } } },
    select: { customerId: true, orderId: true },
  });
  if (!report) return { error: "Report not found." };

  const approved = decision !== "REJECT";
  const num = orderNumber(report.orderId);

  const decided = await prisma.$transaction(async (tx) => {
    // Only an OPEN report can be decided, so a double click can't decide it twice.
    const updated = await tx.complaint.updateMany({
      where: { id, status: "OPEN" },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        resolution: approved ? (decision as "REFUND" | "REPLACEMENT") : null,
        adminNote: note || null, // the seller's reply, shown to the customer
        resolvedAt: new Date(),
      },
    });
    if (updated.count === 0) return false;
    await tx.notification.create({
      data: {
        userId: report.customerId,
        message: !approved
          ? `The seller looked at your report on order #${num} and didn't approve it. Tap to see why.`
          : decision === "REFUND"
            ? `Good news: the seller will return your money for order #${num}.`
            : `Good news: the seller will send you a new box for order #${num}.`,
        link: `/customer/orders/${report.orderId}`,
      },
    });
    return true;
  });
  if (!decided) return { error: "This report was already decided." };

  revalidateReport(report.orderId);
  return { ok: true };
}

// After approving a refund or a new box, the seller does it and ticks it off.
export async function completeReport(fd: FormData) {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "complaintId");
  const report = await prisma.complaint.findFirst({
    where: { id, status: "APPROVED", completedAt: null, order: { batch: { sellerId: user.id } } },
    select: { customerId: true, orderId: true, resolution: true },
  });
  if (!report) return;
  const num = orderNumber(report.orderId);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.complaint.updateMany({ where: { id, completedAt: null }, data: { completedAt: new Date() } });
    if (updated.count === 0) return;
    await tx.notification.create({
      data: {
        userId: report.customerId,
        message:
          report.resolution === "REFUND"
            ? `The seller has returned your money for order #${num}.`
            : `The seller has sent you a new box for order #${num}.`,
        link: `/customer/orders/${report.orderId}`,
      },
    });
  });
  revalidateReport(report.orderId);
}
