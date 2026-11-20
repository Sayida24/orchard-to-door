import { Suspense } from "react";
import { ui } from "@/lib/ui";
import { SellerNav } from "./seller-nav";

// Each seller page still checks the role itself via requireUser(["SELLER"]).
export default function SellerLayout({ children }: LayoutProps<"/seller">) {
  return (
    <div className={ui.page}>
      <div className="print:hidden">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-lime-800">Seller</p>
        {/* usePathname suspends on dynamic routes like /seller/batches/[id] */}
        <Suspense fallback={<div className="h-[45px] border-b border-stone-200" />}>
          <SellerNav />
        </Suspense>
      </div>
      <div className="pt-6 print:pt-0">{children}</div>
    </div>
  );
}