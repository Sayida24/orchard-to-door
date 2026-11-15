import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "./sign-out-button";

const pill =
  "inline-flex h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-[#CFC7B5] hover:bg-cream";

// The logo renders instantly; the user menu reads the session, so it streams in.
export function SiteHeader() {
  return (
    <header className="relative z-20 w-full border-b border-line/70 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="font-display text-[26px] font-bold tracking-tight text-leaf">
          Orchiva
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
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
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-[#CFC7B5] hover:bg-cream"
    >
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#B42318] px-1 text-center text-[11px] font-bold leading-[18px] text-white">
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
        <Link href="/login" className={pill}>
          Log in
        </Link>
        <Link href="/register" className="inline-flex h-11 items-center rounded-full bg-mango px-4 text-sm font-bold text-ink hover:bg-mango-dark">
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      {user.role === "ADMIN" && (
        <Link href="/admin" className={pill}>
          Admin
        </Link>
      )}
      {user.role === "SELLER" && (
        <Link href="/seller" className={pill}>
          Seller
        </Link>
      )}
      {user.role === "CUSTOMER" && (
        <>
          {/* On phones the logo already leads customers to the orchards */}
          <Link href="/customer" className={`${pill} hidden sm:inline-flex`}>
            Orchards
          </Link>
          <Link href="/customer/orders" className={pill}>
            My orders
          </Link>
        </>
      )}
      <NotificationBell userId={user.id} />
      <span className="hidden text-sm text-muted md:inline">Hi, {user.name.split(" ")[0]}</span>
      <SignOutButton />
    </>
  );
}
