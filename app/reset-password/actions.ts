"use server";

import bcrypt from "bcryptjs";
import { findValidToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD } from "@/lib/validation";

export type ResetState = { done?: boolean; expired?: boolean; error?: string } | undefined;

export async function resetPassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters.` };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const row = await findValidToken(token);
  if (!row) return { expired: true };

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  // Claim the token only if it's still unused, so a link can't be used twice
  // even if it's submitted from two tabs at once.
  const ok = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count === 0) return false;
    // passwordChangedAt also logs out every other session for this user.
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash, passwordChangedAt: now } });
    return true;
  });

  return ok ? { done: true } : { expired: true };
}
