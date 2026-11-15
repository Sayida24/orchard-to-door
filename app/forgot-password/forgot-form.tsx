"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ui } from "@/lib/ui";
import { requestPasswordReset, type ForgotState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, undefined);

  if (state?.done) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          <p className="font-semibold">Check your email</p>
          <p className="mt-1">
            If an account with that phone number or email has an email address, we&apos;ve sent it a reset link.
            The link expires in 30 minutes.
          </p>
        </div>
        <div className="rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-700">
          <p className="font-semibold">No email on your account?</p>
          <p className="mt-1">
            Contact Orchiva support with your phone number. An admin can send you a one-time reset link.
          </p>
        </div>
        <Link href="/login" className={`${ui.button} w-full`}>
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="identifier" className={ui.label}>
          Phone or email
        </label>
        <input
          id="identifier"
          name="identifier"
          required
          autoComplete="username"
          placeholder="01XXXXXXXXX or you@example.com"
          defaultValue={state?.identifier}
          className={ui.input}
        />
      </div>
      {state?.error && (
        <p role="alert" className={ui.fieldError}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${ui.button} w-full`}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-sm text-stone-600">
        Remembered it?{" "}
        <Link href="/login" className={ui.link}>
          Log in
        </Link>
      </p>
    </form>
  );
}
