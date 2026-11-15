import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { ui } from "@/lib/ui";
import { OrchardProfileForm } from "../orchard-form";

export default function NewOrchardPage() {
  return (
    <main className="max-w-xl">
      <Link href="/seller/orchards" className={`${ui.link} mb-3 inline-block text-sm`}>
        My orchards
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Create your orchard profile</h1>
      <p className="mb-4 text-sm text-stone-600">
        Customers see this on your orchard&apos;s card and page. You can change it any time.
      </p>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <NewOrchard />
      </Suspense>
    </main>
  );
}

async function NewOrchard() {
  await requireUser(["SELLER"]);
  return <OrchardProfileForm />;
}
