import { Suspense } from "react";
import { ui } from "@/lib/ui";
import { AdminNav } from "./admin-nav";

// Each admin page still checks the role itself via requireUser(["ADMIN"]).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={ui.page}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-700">Admin</p>
      {/* usePathname suspends on dynamic routes like /admin/orchards/[id] */}
      <Suspense fallback={<div className="h-[45px] border-b border-stone-200" />}>
        <AdminNav />
      </Suspense>
      <div className="pt-6">{children}</div>
    </div>
  );
}
