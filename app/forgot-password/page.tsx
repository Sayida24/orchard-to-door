import type { Metadata } from "next";
import { ui } from "@/lib/ui";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password · Orchiva" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-start justify-center bg-stone-50 px-4 py-10 sm:py-16">
      <div className={`${ui.card} w-full max-w-md p-6 sm:p-8`}>
        <p className="text-3xl">🔑</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Forgot your password?</h1>
        <p className="mb-6 mt-1 text-sm text-stone-600">
          Enter the phone number or email you use to log in. We&apos;ll email you a link to choose a new password.
        </p>
        <ForgotForm />
      </div>
    </main>
  );
}
