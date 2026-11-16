"use client";

import { signOut } from "next-auth/react";

// Icon-only on phones (the header is narrow there), "Log out" from small screens up.
export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      aria-label="Log out"
      className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-[#CFC7B5] hover:bg-cream sm:px-4"
    >
      <svg aria-hidden="true" className="h-5 w-5 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      <span aria-hidden="true" className="hidden sm:inline">
        Log out
      </span>
    </button>
  );
}
