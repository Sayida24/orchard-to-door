"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ui } from "@/lib/ui";
import { MIN_PASSWORD } from "@/lib/validation";
import { resetPassword, type ResetState } from "./actions";

export function ResetForm({ token, name }: { token: string; name: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, undefined);

  if (state?.done) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          <p className="font-semibold">Password changed</p>
          <p className="mt-1">You can now log in with your new password. Other devices have been logged out.</p>
        </div>
        <Link href="/login" className={`${ui.button} w-full`}>
          Log in
        </Link>
      </div>
    );
  }

  if (state?.expired) return <ExpiredNotice />;

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-stone-600">
        Hi {name}, choose a new password for your account.
      </p>
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className={ui.label}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          className={ui.input}
        />
        <p className="mt-1 text-xs text-stone-500">At least {MIN_PASSWORD} characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className={ui.label}>
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          className={ui.input}
        />
      </div>
      {state?.error && (
        <p role="alert" className={ui.fieldError}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${ui.button} w-full`}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export function ExpiredNotice() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <p className="font-semibold">This link has expired or was already used</p>
        <p className="mt-1">Reset links work once and only for a limited time. Ask for a new one.</p>
      </div>
      <Link href="/forgot-password" className={`${ui.button} w-full`}>
        Get a new link
      </Link>
    </div>
  );
}
