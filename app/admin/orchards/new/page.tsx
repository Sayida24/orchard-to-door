import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrchardForm } from "../orchard-form";

export default function NewOrchardPage() {
  return (
    <main className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">New orchard</h1>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <NewOrchard />
      </Suspense>
    </main>
  );
}

async function NewOrchard() {
  await requireUser(["ADMIN"]);
  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });
  return <OrchardForm sellers={sellers} />;
}
