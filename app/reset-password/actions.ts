"use server";

import bcrypt from "bcryptjs";
import { findValidToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { emailFromRecoveryToken, endRecoverySession } from "@/lib/supabase-auth";
import { MIN_PASSWORD } from "@/lib/validation";

export type ResetState = { done?: boolean; expired?: boolean; error?: string } | undefined;

export async function resetPassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const token = String(fd.get("token") ?? "");
  const accessToken = String(fd.get("accessToken") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters.` };
  if (password !== confirm) return { error: "The two passwords don't match." };

  if (accessToken) return resetFromSupabaseLink(accessToken, password);

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

// A link emailed by Supabase Auth: Supabase confirms the link is valid and tells us which
// email it was sent to; the new password is saved in Orchiva's own User table.
async function resetFromSupabaseLink(accessToken: string, password: string): Promise<ResetState> {
  const email = await emailFromRecoveryToken(accessToken);
  if (!email) return { expired: true };

  const passwordHash = await bcrypt.hash(password, 10);
  // passwordChangedAt also logs out every other session for this user.
  const updated = await prisma.user.updateMany({
    where: { email: { equals: email, mode: "insensitive" } },
    data: { passwordHash, passwordChangedAt: new Date() },
  });
  if (updated.count === 0) return { expired: true };

  await endRecoverySession(accessToken); // the link works only once
  return { done: true };
}
