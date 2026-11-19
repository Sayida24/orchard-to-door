"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The tabs from the seller dashboard design. The last three arrive with
// harvest video storage (Part B) and smart packing (Part C).
const links = [
  { href: "/seller", label: "Overview" },
  { href: "/seller/orchards", label: "My orchards" },
  { href: "/seller/batches", label: "Harvest batches" },
  { href: "/seller/orders", label: "Orders & packing" },
  { href: "/seller/inspection", label: "AI inspection" },
];
const soon = ["QR verification", "Orchard media"];

export function SellerNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-1 border-b border-stone-200">
        {links.map((l) => {
          const active = l.href === "/seller" ? pathname === "/seller" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${
                  active ? "border-amber-500 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
        {soon.map((label) => (
          <li key={label} className="flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm text-stone-400">
            {label}
            <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-500">
              Soon
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
