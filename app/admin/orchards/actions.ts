"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, optStr, str, type FormState } from "@/lib/form";
import { prisma } from "@/lib/prisma";

// FR-22: create or update an orchard. Each orchard belongs to one seller.
export async function saveOrchard(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);

  const id = str(fd, "id");
  const name = str(fd, "name");
  const location = str(fd, "location");
  const description = optStr(fd, "description");
  const sellerId = str(fd, "sellerId");

  if (name.length < 2) return fail(fd, "Enter the orchard name.");
  if (location.length < 2) return fail(fd, "Enter the location, e.g. Shibganj, Chapainawabganj.");
  const seller = await prisma.user.findFirst({ where: { id: sellerId, role: "SELLER" } });
  if (!seller) return fail(fd, "Choose the seller who runs this orchard.");

  const data = { name, location, description, sellerId };
  if (id) await prisma.orchard.update({ where: { id }, data });
  else await prisma.orchard.create({ data: { ...data, photoUrls: [] } });

  revalidatePath("/admin/orchards");
  redirect("/admin/orchards");
}

// Only orchards with no batches can be deleted; batch history must stay intact.
export async function deleteOrchard(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  if ((await prisma.batch.count({ where: { orchardId: id } })) > 0) return;
  await prisma.orchard.delete({ where: { id } });
  revalidatePath("/admin/orchards");
  redirect("/admin/orchards");
}
