import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { VarietyForm } from "../variety-form";

export default function NewVarietyPage() {
  return (
    <main className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">New variety</h1>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <NewVariety />
      </Suspense>
    </main>
  );
}

async function NewVariety() {
  await requireUser(["ADMIN"]);
  return <VarietyForm />;
}
