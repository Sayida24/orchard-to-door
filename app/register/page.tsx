import type { Metadata } from "next";
import { ui } from "@/lib/ui";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account · Orchiva" };

export default function RegisterPage() {
  return (
    <main className={`${ui.page} max-w-md`}>
      <div className={ui.card}>
        <h1 className="mb-1 text-2xl font-bold text-stone-900">Create account</h1>
        <p className="mb-5 text-sm text-stone-600">Order mangoes straight from the orchard.</p>
        <RegisterForm />
      </div>
    </main>
  );
}
