import Link from "next/link";
import { Suspense } from "react";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";
import { setUserRole } from "./actions";

const roleBadge: Record<Role, string> = {
  CUSTOMER: "bg-stone-100 text-stone-700",
  SELLER: "bg-lime-100 text-lime-800",
  ADMIN: "bg-amber-100 text-amber-800",
};

export default function AdminUsersPage() {
  return (
    <main className={ui.page}>
      <Link href="/admin" className={`${ui.link} text-sm`}>
        ← Admin
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">Users and roles</h1>
      <Suspense fallback={<p className="text-stone-500">Loading users…</p>}>
        <UserList />
      </Suspense>
    </main>
  );
}

async function UserList() {
  const admin = await requireUser([Role.ADMIN]);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true },
  });

  return (
    <ul className="space-y-3">
      {users.map((u) => (
        <li key={u.id} className={`${ui.card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="min-w-0">
            <p className="font-semibold">
              {u.name}{" "}
              <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[u.role]}`}>
                {u.role.toLowerCase()}
              </span>
            </p>
            <p className="truncate text-sm text-stone-600">
              {u.phone}
              {u.email ? ` · ${u.email}` : ""}
            </p>
          </div>

          {u.id === admin.id ? (
            <p className="text-sm text-stone-500">This is you</p>
          ) : (
            <form action={setUserRole} className="flex gap-2">
              <input type="hidden" name="userId" value={u.id} />
              <label className="sr-only" htmlFor={`role-${u.id}`}>
                Role for {u.name}
              </label>
              <select
                id={`role-${u.id}`}
                name="role"
                defaultValue={u.role}
                className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm"
              >
                {Object.values(Role).map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <button type="submit" className={ui.buttonSecondary}>
                Save
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
