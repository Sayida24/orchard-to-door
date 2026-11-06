"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { BD_PHONE, EMAIL, MIN_PASSWORD, normalizePhone } from "@/lib/validation";

type Field = "name" | "phone" | "email" | "password";

export type RegisterState =
  | { ok?: false; errors?: Partial<Record<Field, string>>; message?: string }
  | { ok: true; phone: string }
  | undefined;

// Public sign-up always creates a CUSTOMER. Sellers and admins are set by an admin.
export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const email = emailRaw || null;
  const password = String(formData.get("password") ?? "");

  const errors: Partial<Record<Field, string>> = {};
  if (name.length < 2) errors.name = "Enter your name.";
  if (!BD_PHONE.test(phone)) errors.phone = "Enter an 11-digit mobile number, e.g. 01712345678.";
  if (email && !EMAIL.test(email)) errors.email = "Enter a valid email or leave it empty.";
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (Object.keys(errors).length) return { errors };

  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
    select: { phone: true },
  });
  if (existing) {
    return existing.phone === phone
      ? { errors: { phone: "This phone number already has an account." } }
      : { errors: { email: "This email already has an account." } };
  }

  await prisma.user.create({
    data: { name, phone, email, passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: true, phone };
}
