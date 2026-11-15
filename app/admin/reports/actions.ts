"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { orderNumber } from "@/lib/shop";

export type DecideState = { ok?: boolean; error?: string } | undefined;

const DECISIONS = ["REFUND", "REPLACEMENT", "REJECT"] as const;

// FR-21 / FR-25: the admin approves a refund or replacement, or turns the report down.
// The customer always hears the outcome. For approved ones the seller carries it out:
// they have the customer's address and phone, so they send the new box or return the money.
export async function decideReport(_prev: DecideState, fd: FormData): Promise<DecideState> {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const decision = str(fd, "decision") as (typeof DECISIONS)[number];
  const note = str(fd, "note").slice(0, 500);

  if (!DECISIONS.includes(decision)) return { error: "Choose refund, replacement or not approved." };
  if (decision === "REJECT" && note.length < 5) return { error: "Tell the customer why it wasn't approved." };

  const report = await prisma.complaint.findUnique({
    where: { id },
    include: { order: { select: { batch: { select: { sellerId: true } } } } },
  });
  if (!report) return { error: "Report not found." };

  const approved = decision !== "REJECT";
  const refund = decision === "REFUND";
  const num = orderNumber(report.orderId);
  const problem = report.reason ?? "a problem";

  const decided = await prisma.$transaction(async (tx) => {
    // Only an OPEN report can be decided, so two admins can't decide the same one twice.
    const updated = await tx.complaint.updateMany({
      where: { id, status: "OPEN" },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        resolution: approved ? (decision as "REFUND" | "REPLACEMENT") : null,
        adminNote: note || null,
        resolvedAt: new Date(),
      },
    });
    if (updated.count === 0) return false;

    const notes = [
      {
        userId: report.customerId,
        message: !approved
          ? `Your report on order #${num} was reviewed and not approved.`
          : refund
            ? `Your report on order #${num} was approved: the seller will return your money.`
            : `Your report on order #${num} was approved: the seller will send you a new box.`,
        link: `/customer/orders/${report.orderId}`,
      },
    ];
    if (approved) {
      notes.push({
        userId: report.order.batch.sellerId,
        message: refund
          ? `Order #${num}: refund approved (${problem}). Please return the money to the customer.`
          : `Order #${num}: replacement approved (${problem}). Please send the customer a new box.`,
        link: "/seller/orders",
      });
    }
    await tx.notification.createMany({ data: notes });
    return true;
  });
  if (!decided) return { error: "This report was already decided." };

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/orchards");
  revalidatePath(`/customer/orders/${report.orderId}`);
  return { ok: true };
}
