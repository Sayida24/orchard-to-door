"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fail, isUniqueError, optNum, optStr, str, type FormState } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const validMonth = (m: number | null) => m === null || (Number.isInteger(m) && m >= 1 && m <= 12);

// FR-22 / FR-04: a variety is also its Mango Guide entry (season, taste, best use).
export async function saveVariety(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);

  const id = str(fd, "id");
  const name = str(fd, "name");
  const seasonStart = optNum(fd, "seasonStart");
  const seasonEnd = optNum(fd, "seasonEnd");
  const taste = optStr(fd, "taste");
  const bestUse = optStr(fd, "bestUse");

  if (name.length < 2) return fail(fd, "Enter the variety name, e.g. Himsagar.");
  if (!validMonth(seasonStart) || !validMonth(seasonEnd)) return fail(fd, "Pick valid months.");
  if ((seasonStart === null) !== (seasonEnd === null)) {
    return fail(fd, "Set both the season start and end, or leave both empty.");
  }

  const data = { name, seasonStart, seasonEnd, taste, bestUse };
  try {
    if (id) await prisma.variety.update({ where: { id }, data });
    else await prisma.variety.create({ data });
  } catch (e) {
    if (isUniqueError(e)) return fail(fd, `A variety called "${name}" already exists.`);
    throw e;
  }

  revalidatePath("/admin/varieties");
  redirect("/admin/varieties");
}

export async function deleteVariety(fd: FormData) {
  await requireUser(["ADMIN"]);
  const id = str(fd, "id");
  if ((await prisma.batch.count({ where: { varietyId: id } })) > 0) return;
  await prisma.variety.delete({ where: { id } });
  revalidatePath("/admin/varieties");
  redirect("/admin/varieties");
}
