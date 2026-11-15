"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, optStr, str, type FormState } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { deletePhoto } from "@/lib/storage";

// Sellers create and own their orchards (FR-22). The admin can only correct the
// details, e.g. a typo in the name; the seller and the photo stay as they are.
export async function saveOrchard(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);

  const id = str(fd, "id");
  const name = str(fd, "name").replace(/\s+/g, " ");
  const location = str(fd, "location").replace(/\s+/g, " ");
  const description = optStr(fd, "description")?.slice(0, 600) ?? null;

  if (name.length < 2 || name.length > 60) return fail(fd, "Enter the orchard name.");
  if (location.length < 2 || location.length > 80) return fail(fd, "Enter the location, e.g. Shibganj, Chapainawabganj.");

  const updated = await prisma.orchard.updateMany({ where: { id }, data: { name, location, description } });
  if (updated.count === 0) return fail(fd, "This orchard no longer exists.");

  revalidatePath("/admin/orchards");
  revalidatePath(`/admin/orchards/${id}`);
  revalidatePath("/customer");
  revalidatePath(`/customer/orchards/${id}`);
  revalidatePath("/seller/orchards");
  redirect(`/admin/orchards/${id}`);
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
  const { photoUrls } = await prisma.orchard.delete({ where: { id }, select: { photoUrls: true } });
  await Promise.all(photoUrls.map((url) => deletePhoto(url).catch(() => {})));
  revalidatePath("/admin/orchards");
  revalidatePath("/seller/orchards");
  redirect("/admin/orchards");
}
