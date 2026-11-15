"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { fail, isUniqueError, str, type FormState } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const PATH = "/admin/delivery-areas";

// FR-10: delivery charge by area. Creates when no id is given, otherwise updates.
export async function saveArea(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);

  const id = str(fd, "id");
  const name = str(fd, "name");
  const fee = Number(str(fd, "fee"));

  if (name.length < 2) return fail(fd, "Enter the area name.");
  if (!Number.isFinite(fee) || fee < 0 || fee > 5000) return fail(fd, "Enter a fee between 0 and 5000 taka.");

  try {
    if (id) await prisma.deliveryArea.update({ where: { id }, data: { name, fee } });
    else await prisma.deliveryArea.create({ data: { name, fee } });
  } catch (e) {
    if (isUniqueError(e)) return fail(fd, `"${name}" already exists.`);
    throw e;
  }
  revalidatePath(PATH);
  return {};
}

// Hiding an area keeps old orders intact but removes it from checkout.
export async function toggleArea(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const area = await prisma.deliveryArea.findUnique({ where: { id } });
  if (!area) return;
  await prisma.deliveryArea.update({ where: { id }, data: { isActive: !area.isActive } });
  revalidatePath(PATH);
}

// Only areas never used by an order can be deleted; otherwise hide them.
export async function deleteArea(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  if ((await prisma.order.count({ where: { deliveryAreaId: id } })) > 0) return;
  await prisma.deliveryArea.delete({ where: { id } });
  revalidatePath(PATH);
}
