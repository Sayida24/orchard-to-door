"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, optStr, str, type FormState } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { deletePhoto, savePhotoFromForm } from "@/lib/storage";

function formPhoto(fd: FormData) {
  const photo = fd.get("photo");
  return photo instanceof File && photo.size > 0 ? photo : null;
}

function revalidateOrchard(id?: string) {
  revalidatePath("/seller");
  revalidatePath("/seller/orchards");
  revalidatePath("/admin/orchards");
  revalidatePath("/customer");
  if (id) {
    revalidatePath(`/seller/orchards/${id}`);
    revalidatePath(`/admin/orchards/${id}`);
    revalidatePath(`/customer/orchards/${id}`);
  }
}

// FR-22: a seller sets up an orchard profile: name, location, description and a cover
// photo that customers see on the orchard's card. A new orchard needs a photo.
export async function saveOrchard(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "id");
  const name = str(fd, "name").replace(/\s+/g, " ");
  const location = str(fd, "location").replace(/\s+/g, " ");
  const description = optStr(fd, "description")?.slice(0, 600) ?? null;
  const photo = formPhoto(fd);

  if (name.length < 2 || name.length > 60) return fail(fd, "Enter your orchard's name.");
  if (location.length < 2 || location.length > 80) return fail(fd, "Enter the location, e.g. Shibganj, Chapainawabganj.");

  const existing = id
    ? await prisma.orchard.findFirst({ where: { id, sellerId: user.id }, select: { photoUrls: true } })
    : null;
  if (id && !existing) return fail(fd, "This orchard no longer exists.");
  if (!id && !photo) return fail(fd, "Add a photo of your orchard. Customers see it on your orchard's card.");

  let photoUrl: string | null = null;
  if (photo) {
    const saved = await savePhotoFromForm(photo, "orchards");
    if ("error" in saved) return fail(fd, saved.error);
    photoUrl = saved.url;
  }

  // A new photo becomes the cover; any other photos stay after it.
  const oldCover = existing?.photoUrls[0];
  const photoUrls = photoUrl ? [photoUrl, ...(existing?.photoUrls.slice(1) ?? [])] : undefined;
  let orchardId = id;
  try {
    if (id) {
      await prisma.orchard.update({
        where: { id },
        data: { name, location, description, ...(photoUrls ? { photoUrls } : {}) },
      });
    } else {
      const created = await prisma.orchard.create({
        data: { name, location, description, photoUrls: photoUrls ?? [], sellerId: user.id },
        select: { id: true },
      });
      orchardId = created.id;
    }
  } catch (e) {
    if (photoUrl) await deletePhoto(photoUrl).catch(() => {}); // don't leave an unused file behind
    throw e;
  }
  if (photoUrl && oldCover) await deletePhoto(oldCover).catch(() => {});

  revalidateOrchard(orchardId);
  redirect(`/seller/orchards/${orchardId}?saved=${id ? "1" : "new"}`);
}

// Only an orchard that never had a batch can be deleted, so order history stays intact.
export async function deleteOrchard(fd: FormData) {
  const user = await requireUser(["SELLER"]);
  const id = str(fd, "id");
  const orchard = await prisma.orchard.findFirst({
    where: { id, sellerId: user.id },
    select: { photoUrls: true, _count: { select: { batches: true } } },
  });
  if (!orchard || orchard._count.batches > 0) return;

  await prisma.orchard.delete({ where: { id } });
  await Promise.all(orchard.photoUrls.map((url) => deletePhoto(url).catch(() => {})));
  revalidateOrchard();
  redirect("/seller/orchards");
}
