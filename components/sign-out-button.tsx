"use client";

import { signOut } from "next-auth/react";
import { ui } from "@/lib/ui";

export function SignOutButton() {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={ui.buttonSecondary}>
      Log out
    </button>
  );
}
