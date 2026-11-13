"use server";

import { sendMail } from "@/lib/mail";
import {
  createResetLink,
  MAX_REQUESTS_PER_HOUR,
  recentRequestCount,
  SELF_SERVICE_TTL_MS,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validation";

export type ForgotState = { done?: boolean; error?: string; identifier?: string } | undefined;

// Always answers the same way, so nobody can use this form to find out
// which phone numbers or emails have accounts.
export async function requestPasswordReset(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const identifier = String(fd.get("identifier") ?? "").trim();
  if (!identifier) return { error: "Enter your phone number or email.", identifier };

  const user = await prisma.user.findUnique({
    where: identifier.includes("@") ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) },
    select: { id: true, name: true, email: true },
  });

  if (user?.email && (await recentRequestCount(user.id)) < MAX_REQUESTS_PER_HOUR) {
    const { url } = await createResetLink(user.id, SELF_SERVICE_TTL_MS);
    const first = user.name.split(" ")[0];
    try {
      await sendMail({
        to: user.email,
        subject: "Reset your Orchiva password",
        text: `Hi ${first},\n\nSomeone asked to reset the password for your Orchiva account. Open this link to choose a new password (it works once and expires in 30 minutes):\n\n${url}\n\nIf it wasn't you, ignore this email — your password stays the same.\n\n— Orchiva`,
        html: `<p>Hi ${escapeHtml(first)},</p><p>Someone asked to reset the password for your Orchiva account. This link works once and expires in 30 minutes:</p><p><a href="${url}" style="display:inline-block;background:#f59e0b;color:#1c1917;padding:12px 20px;border-radius:10px;font-weight:600;text-decoration:none">Choose a new password</a></p><p style="color:#78716c;font-size:13px">If it wasn't you, ignore this email — your password stays the same.</p><p>— Orchiva</p>`,
      });
    } catch (e) {
      console.error("Password reset email failed:", e);
    }
  }

  return { done: true };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
