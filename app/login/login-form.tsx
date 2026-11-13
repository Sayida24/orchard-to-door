
"use client";

import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ui } from "@/lib/ui";

// Only allow same-site paths.
function safeCallback(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//")
    ? raw
    : "/";
}

export function LoginForm() {
  const router = useRouter();
  const callbackUrl = safeCallback(
    useSearchParams().get("callbackUrl")
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    const res = await signIn("credentials", {
      identifier: String(fd.get("identifier") ?? ""),
      password: String(fd.get("password") ?? ""),
      redirect: false,
    });

    if (!res?.ok) {
      setPending(false);
      setError("Wrong phone/email or password.");
      return;
    }

    // Get the logged-in user's role.
    const session = await getSession();
    const role = session?.user?.role;

    // Choose the correct dashboard.
    const roleDestination =
      role === "ADMIN"
        ? "/admin"
        : role === "SELLER"
          ? "/seller"
          : "/";

    // Respect an existing protected-page callback.
    const destination =
      callbackUrl !== "/" ? callbackUrl : roleDestination;

    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          className={ui.input}
        />
      </div>

      <div>
        <label htmlFor="password" className={ui.label}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={ui.input}
        />
      </div>

      {error && (
        <p role="alert" className={ui.fieldError}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${ui.button} w-full`}
      >
        {pending ? "Logging in…" : "Log in"}
      </button>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-stone-600 underline-offset-4 transition-colors hover:text-amber-700 hover:underline"
        >
          Forgot your password?
        </Link>
      </div>

      {/* Divider, then sign-up as a quieter secondary action */}
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-stone-400" aria-hidden="true">
        <span className="h-px flex-1 bg-stone-200" />
        New to Orchiva?
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <Link href="/register" className={`${ui.buttonSecondary} w-full`}>
        Create an account
      </Link>
    </form>
  );
}
