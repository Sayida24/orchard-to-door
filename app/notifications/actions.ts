"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/form";
import { prisma } from "@/lib/prisma";

// Opening a notification marks it read, then goes to what it's about.
export async function openNotification(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const note = await prisma.notification.findFirst({ where: { id, userId: user.id }, select: { link: true, isRead: true } });
  if (!note) return;
  if (!note.isRead) await prisma.notification.update({ where: { id }, data: { isRead: true } });
  revalidatePath("/", "layout"); // the bell's count in the header
  // Only links inside the app (never "//other-site").
  if (note.link?.startsWith("/") && !note.link.startsWith("//")) redirect(note.link);
}

export async function markAllRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/", "layout");
}
