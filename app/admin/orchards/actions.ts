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

// Pause: the orchard disappears for customers and takes no new orders; orders already
// placed carry on. Resume brings it back. The seller is told either way.
export async function setOrchardActive(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const isActive = str(fd, "active") === "1"; // the state to set, so a double click can't flip it back
  const orchard = await prisma.orchard.findUnique({ where: { id }, select: { name: true, sellerId: true, isActive: true } });
  if (!orchard || orchard.isActive === isActive) return;

  await prisma.$transaction([
    prisma.orchard.update({ where: { id }, data: { isActive } }),
    prisma.notification.create({
      data: {
        userId: orchard.sellerId,
        message: isActive
          ? `${orchard.name} is open again: customers can see it and order.`
          : `An admin paused ${orchard.name}. Customers can't order from it until it's resumed. Orders already placed carry on.`,
        link: "/seller",
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/admin/orchards");
  revalidatePath(`/admin/orchards/${id}`);
  revalidatePath("/customer");
  revalidatePath(`/customer/orchards/${id}`);
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
