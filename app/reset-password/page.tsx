import type { Metadata } from "next";
import { Suspense } from "react";
import { findValidToken } from "@/lib/password-reset";
import { ui } from "@/lib/ui";
import { ExpiredNotice, ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Choose a new password · Orchiva",
  referrer: "no-referrer", // keep the token out of Referer headers
};

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <main className="flex flex-1 items-start justify-center bg-stone-50 px-4 py-10 sm:py-16">
      <div className={`${ui.card} w-full max-w-md p-6 sm:p-8`}>
        <p className="text-3xl">🔒</p>
        <h1 className="mb-4 mt-2 text-2xl font-bold text-stone-900">Choose a new password</h1>
        {/* searchParams is request data, so it resolves inside the boundary */}
        <Suspense fallback={<div className="h-56" />}>
          <ResetContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function ResetContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const row = await findValidToken(value);
  if (!row) return <ExpiredNotice />;
  return <ResetForm token={value} name={row.user.name.split(" ")[0]} />;
}
