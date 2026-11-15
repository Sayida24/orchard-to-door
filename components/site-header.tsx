import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ui } from "@/lib/ui";
import { SignOutButton } from "./sign-out-button";

// The logo renders instantly; the user menu reads the session, so it streams in.
export function SiteHeader() {
  return (
    <header className="relative z-10 w-full border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-stone-900">
          Orchiva
        </Link>
        <nav className="flex items-center gap-2">
          <Suspense fallback={<div className="h-11 w-24" />}>
            <UserMenu />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

// FR-12 / FR-18: unread notifications for any logged-in user.
async function NotificationBell({ userId }: { userId: string }) {
  const unread = await prisma.notification.count({ where: { userId, isRead: false } });
  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
    >
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <Link href="/login" className={ui.buttonSecondary}>
          Log in
        </Link>
        <Link href="/register" className={`${ui.button} min-h-11 px-4 py-2 text-sm`}>
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      {user.role === "ADMIN" && (
        <Link href="/admin" className={ui.buttonSecondary}>
          Admin
        </Link>
      )}
      {user.role === "SELLER" && (
        <Link href="/seller" className={ui.buttonSecondary}>
          Seller
        </Link>
      )}
      {user.role === "CUSTOMER" && (
        <>
          {/* On phones the logo already leads customers to the orchards */}
          <Link href="/customer" className={`${ui.buttonSecondary} hidden sm:inline-flex`}>
            Orchards
          </Link>
          <Link href="/customer/orders" className={ui.buttonSecondary}>
            My orders
          </Link>
        </>
      )}
      <NotificationBell userId={user.id} />
      <span className="hidden text-sm text-stone-600 sm:inline">Hi, {user.name.split(" ")[0]}</span>
      <SignOutButton />
    </>
  );
}
