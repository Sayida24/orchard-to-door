
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { SellerDashboard } from "@/components/seller-dashboard";

export default function SellerHome() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-stone-50 p-8">
          <p className="text-stone-500">
            Loading your mango seller dashboard...
          </p>
        </main>
      }
    >
      <SellerContent />
    </Suspense>
  );
}

async function SellerContent() {
  const user = await requireUser(["SELLER", "ADMIN"]);

  return (
    <SellerDashboard sellerName={user.name ?? "Seller"} />
  );
}
