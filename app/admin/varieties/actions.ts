"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isUniqueError, str } from "@/lib/form";
import { prisma } from "@/lib/prisma";

export type RenameState =
  | { ok?: boolean; error?: string; name?: string; mergeInto?: { id: string; name: string } }
  | undefined;

// Sellers add varieties; the admin can correct a name (e.g. "Himsager" -> "Himsagar").
// If the corrected name already exists, the admin may merge: the batches move to the
// existing variety and the duplicate is removed. The seller who added it is told.
export async function renameVariety(_prev: RenameState, fd: FormData): Promise<RenameState> {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  const name = str(fd, "name").replace(/\s+/g, " ");
  const merge = str(fd, "merge") === "1";

  if (name.length < 2 || name.length > 40) return { error: "Enter a name between 2 and 40 characters.", name };
  const variety = await prisma.variety.findUnique({ where: { id }, select: { name: true, addedById: true } });
  if (!variety) return { error: "This variety no longer exists.", name };
  if (name === variety.name) return { error: "That's already its name.", name };

  // Same name ignoring capitals, e.g. "himsagar" when "Himsagar" exists.
  const existing = await prisma.variety.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, NOT: { id } },
    select: { id: true, name: true },
  });
  if (existing && !merge) {
    return { error: `There's already a variety called "${existing.name}".`, name, mergeInto: existing };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.batch.updateMany({ where: { varietyId: id }, data: { varietyId: existing.id } });
        await tx.variety.delete({ where: { id } });
      } else {
        await tx.variety.update({ where: { id }, data: { name } });
      }
      if (variety.addedById) {
        await tx.notification.create({
          data: {
            userId: variety.addedById,
            message: existing
              ? `An admin merged your variety "${variety.name}" into "${existing.name}".`
              : `An admin renamed your variety "${variety.name}" to "${name}".`,
            link: "/seller",
          },
        });
      }
    });
  } catch (e) {
    if (isUniqueError(e)) return { error: `There's already a variety called "${name}".`, name };
    throw e;
  }

  revalidatePath("/admin/varieties");
  revalidatePath("/customer"); // variety buttons on the customer home page
  if (existing) redirect(`/admin/varieties/${existing.id}`); // this one is gone; show the one it merged into
  revalidatePath(`/admin/varieties/${id}`);
  return { ok: true, name };
}
