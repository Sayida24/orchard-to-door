"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
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
