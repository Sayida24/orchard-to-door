import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { ui } from "@/lib/ui";

// Placeholder: batch listing and packing arrive in days 6–8 and 14–15.
export default function SellerHome() {
  return (
    <main className={ui.page}>
      <h1 className="mb-4 text-2xl font-bold">Seller</h1>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <SellerWelcome />
      </Suspense>
    </main>
  );
}

async function SellerWelcome() {
  const user = await requireUser(["SELLER", "ADMIN"]);
  return (
    <div className={ui.card}>
      <p className="font-semibold">Welcome, {user.name}.</p>
      <p className="mt-1 text-sm text-stone-600">
        Listing harvest batches and packing orders will appear here.
      </p>
    </div>
  );
}
