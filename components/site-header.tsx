import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { ui } from "@/lib/ui";
import { SignOutButton } from "./sign-out-button";

// The logo renders instantly; the user menu reads the session, so it streams in.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-stone-900">
          🥭 Orchiva
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
      <span className="hidden text-sm text-stone-600 sm:inline">Hi, {user.name.split(" ")[0]}</span>
      <SignOutButton />
    </>
  );
}
