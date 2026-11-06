import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { ui } from "@/lib/ui";

const sections = [
  { href: "/admin/users", title: "Users and roles", note: "Make customers sellers or admins", ready: true },
  { href: "#", title: "Orchards", note: "Coming next", ready: false },
  { href: "#", title: "Varieties and Mango Guide", note: "Coming next", ready: false },
  { href: "#", title: "Delivery areas", note: "Coming soon", ready: false },
  { href: "#", title: "Orders and complaints", note: "Coming soon", ready: false },
];

export default function AdminHome() {
  return (
    <main className={ui.page}>
      <h1 className="mb-4 text-2xl font-bold">Admin</h1>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <AdminSections />
      </Suspense>
    </main>
  );
}

async function AdminSections() {
  await requireUser(["ADMIN"]);
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sections.map((s) => (
        <li key={s.title}>
          {s.ready ? (
            <Link href={s.href} className={`${ui.card} block hover:border-amber-400`}>
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-stone-600">{s.note}</p>
            </Link>
          ) : (
            <div className={`${ui.card} opacity-60`}>
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-stone-600">{s.note}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
