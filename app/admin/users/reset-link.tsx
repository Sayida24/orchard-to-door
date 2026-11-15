"use client";

import { useActionState, useState } from "react";
import { ui } from "@/lib/ui";
import { createUserResetLink, type ResetLinkState } from "./actions";

// For users without an email (or who can't reach it): the admin creates a
// one-time link and sends it to them privately, e.g. on WhatsApp.
export function ResetLinkButton({ userId, userName }: { userId: string; userName: string }) {
  const [state, action, pending] = useActionState<ResetLinkState, FormData>(createUserResetLink, undefined);
  const [copied, setCopied] = useState(false);

  if (state?.url) {
    return (
      <div className="w-full rounded-xl bg-amber-50 p-3 text-sm sm:max-w-sm">
        <p className="font-medium text-amber-900">Reset link for {userName}</p>
        <div className="mt-2 flex gap-2">
          <input
            readOnly
            value={state.url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Reset link"
            className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-2 py-2 text-xs"
          />
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(state.url!);
              setCopied(true);
            }}
            className={ui.buttonSecondary}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-amber-800">
          Works once, expires in 24 hours. Send it only to {userName}, privately.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className={`${ui.buttonSecondary} whitespace-nowrap`}>
        {pending ? "Creating…" : "Reset link"}
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
