"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { ui } from "@/lib/ui";
import { register, type RegisterState } from "./actions";

export function RegisterForm() {
  const router = useRouter();

  // Create the account on the server, then log straight in.
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    async (prev, formData) => {
      const result = await register(prev, formData);
      if (!result?.ok) return result;
      const login = await signIn("credentials", {
        identifier: result.phone,
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });
      if (!login?.ok) return { message: "Account created. Please log in." };
      router.push("/");
      router.refresh();
      return result;
    },
    undefined,
  );

  const errors = state && !state.ok ? state.errors : undefined;
  const message = state && !state.ok ? state.message : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className={ui.label}>
          Full name
        </label>
        <input id="name" name="name" required autoComplete="name" className={ui.input} />
        {errors?.name && <p className={ui.fieldError}>{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="phone" className={ui.label}>
          Mobile number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          className={ui.input}
        />
        {errors?.phone && <p className={ui.fieldError}>{errors.phone}</p>}
      </div>
      <div>
        <label htmlFor="email" className={ui.label}>
          Email <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className={ui.input} />
        {errors?.email && <p className={ui.fieldError}>{errors.email}</p>}
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
          autoComplete="new-password"
          className={ui.input}
        />
        {errors?.password && <p className={ui.fieldError}>{errors.password}</p>}
      </div>
      {message && (
        <p role="alert" className="text-sm text-stone-700">
          {message}{" "}
          <Link href="/login" className={ui.link}>
            Log in
          </Link>
        </p>
      )}
      <button type="submit" disabled={pending} className={`${ui.button} w-full`}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className={ui.link}>
          Log in
        </Link>
      </p>
    </form>
  );
}
