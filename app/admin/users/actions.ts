"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { ADMIN_LINK_TTL_MS, createResetLink } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

// FR-23: admin changes a user's role. Re-checks the caller is an admin.
export async function setUserRole(formData: FormData) {
  const admin = await requireUser([Role.ADMIN]);

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!userId || !Object.values(Role).includes(role)) return;

  // Don't let an admin lock themselves out.
  if (userId === admin.id && role !== Role.ADMIN) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export type ResetLinkState = { url?: string; error?: string } | undefined;

// Forgot-password fallback for users without email: the admin creates a
// one-time link (24 h) and shares it with the user privately.
export async function createUserResetLink(_prev: ResetLinkState, formData: FormData): Promise<ResetLinkState> {
  const admin = await requireUser([Role.ADMIN]);
  const userId = String(formData.get("userId") ?? "");
  if (userId === admin.id) return { error: "Use Forgot password for your own account." };
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
    return { error: "User not found." };
  }
  const { url } = await createResetLink(userId, ADMIN_LINK_TTL_MS, admin.id);
  return { url };
}
