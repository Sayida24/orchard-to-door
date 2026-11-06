import type { Metadata } from "next";
import { Suspense } from "react";
import { ui } from "@/lib/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Orchiva" };

export default function LoginPage() {
  return (
    <main className={`${ui.page} max-w-md`}>
      <div className={ui.card}>
        <h1 className="mb-1 text-2xl font-bold text-stone-900">Log in</h1>
        <p className="mb-5 text-sm text-stone-600">Welcome back to Orchiva.</p>
        {/* LoginForm reads ?callbackUrl, which is request data */}
        <Suspense fallback={<div className="h-64" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
