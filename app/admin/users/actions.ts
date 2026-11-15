"use server";

import { randomBytes } from "node:crypto";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isUniqueError } from "@/lib/form";
import { ADMIN_LINK_TTL_MS, createResetLink } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { BD_PHONE, EMAIL, normalizePhone } from "@/lib/validation";

// FR-23: admin changes a user's role. Re-checks the caller is an admin.
export async function setUserRole(formData: FormData) {
  const admin = await requireUser([Role.ADMIN]);

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!userId || !Object.values(Role).includes(role)) return;

  // Don't let an admin lock themselves out.
  if (userId === admin.id && role !== Role.ADMIN) return;

  const before = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!before || before.role === role) return;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role } });
    if (role === Role.SELLER) {
      await tx.notification.create({
        data: {
          userId,
          message: "You're now a seller on Orchiva. Start by creating your orchard profile.",
          link: "/seller/orchards/new",
        },
      });
    } else if (before.role === Role.SELLER) {
      // A former seller's orchards stop selling; orders already placed carry on.
      await tx.orchard.updateMany({ where: { sellerId: userId, isActive: true }, data: { isActive: false } });
    }
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/orchards");
  revalidatePath("/customer");
}

export type AddSellerState =
  | { error?: string; values?: Record<string, string>; created?: { name: string; phone: string; url: string } }
  | undefined;

// Sellers come through the admin: someone who wants to sell gets in touch, and the admin
// creates their account here. The seller gets a one-time link (24 h) to choose their own
// password, so the admin never knows it. Then they create their orchard profile.
export async function createSeller(_prev: AddSellerState, formData: FormData): Promise<AddSellerState> {
  const admin = await requireUser([Role.ADMIN]);
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = normalizePhone(phoneRaw);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const values = { name, phone: phoneRaw, email };

  if (name.length < 2 || name.length > 60) return { error: "Enter the seller's name.", values };
  if (!BD_PHONE.test(phone)) return { error: "Enter an 11-digit mobile number, e.g. 01712345678.", values };
  if (email && !EMAIL.test(email)) return { error: "Enter a valid email, or leave it empty.", values };

  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
    select: { phone: true, role: true },
  });
  if (existing) {
    const error =
      existing.phone !== phone
        ? "This email already has an account."
        : existing.role === Role.SELLER
          ? "This phone number already has a seller account."
          : "This phone number already has an account. To make them a seller, change their role in the list below.";
    return { error, values };
  }

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: email || null,
        role: Role.SELLER,
        // Nobody can log in with this; the seller sets a real password with the link.
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (e) {
    if (isUniqueError(e)) return { error: "This phone number or email already has an account.", values };
    throw e;
  }

  await prisma.notification.create({
    data: { userId, message: "Welcome to Orchiva! Start by creating your orchard profile.", link: "/seller/orchards/new" },
  });
  const { url } = await createResetLink(userId, ADMIN_LINK_TTL_MS, admin.id);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { created: { name, phone, url } };
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
