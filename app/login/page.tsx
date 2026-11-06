import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import mangoes from "@/public/images/mangoes.png";
import orchard from "@/public/images/orchard.png";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Orchiva" };

const promises = [
  { icon: "🎥", text: "Watch the harvest video before you order" },
  { icon: "📦", text: "See your own packed box in 3D" },
  { icon: "🔍", text: "Every box checked by AI before it ships" },
];

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col lg:flex-row">
      {/* ---------- Story panel: orchard photo ---------- */}
      <section className="relative isolate overflow-hidden bg-emerald-950 lg:w-[55%]">
        {/* The source photo is small, so it's graded and softened under a
            green overlay rather than shown sharp and full-size. */}
        <Image
          src={orchard}
          alt="Mango trees heavy with green fruit in a Bangladeshi orchard"
          fill
          priority
          placeholder="blur"
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="-z-20 scale-105 object-cover object-center saturate-[1.15] contrast-[1.05] blur-[1px]"
        />
        {/* Light from the top-left, deep shade at the bottom for legible text */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-emerald-950 via-emerald-950/70 to-emerald-900/20" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.25),transparent_55%)]" />

        <div className="flex h-full flex-col justify-end gap-8 px-5 pb-10 pt-24 sm:px-10 lg:min-h-[calc(100vh-4rem)] lg:justify-center lg:px-14 lg:py-16">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-200 ring-1 ring-white/20 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Season open · Rajshahi &amp; Chapainawabganj
            </p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
              Bangladesh&apos;s finest mangoes,{" "}
              <span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
                delivered fresh
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base text-emerald-50/85 sm:text-lg">
              Straight from the orchard to your door, picked days ago, not weeks.
            </p>
          </div>

          {/* Hidden on phones so the login form stays near the top */}
          <div className="hidden gap-6 sm:flex sm:flex-row sm:items-end">
            {/* Mango photo as a framed print at close to its native size */}
            <figure className="relative hidden w-56 shrink-0 -rotate-2 rounded-2xl bg-white p-2 pb-3 shadow-2xl shadow-black/40 sm:block">
              <Image
                src={mangoes}
                alt="Freshly picked ripe mangoes"
                placeholder="blur"
                sizes="224px"
                className="aspect-[4/3] w-full rounded-xl object-cover saturate-[1.1]"
              />
              <figcaption className="mt-2 px-1 text-xs font-medium text-stone-600">
                Today&apos;s harvest · Himsagar
              </figcaption>
            </figure>

            <ul className="space-y-2.5">
              {promises.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
                    {p.icon}
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Form panel ---------- */}
      <section className="relative flex flex-1 items-start justify-center bg-stone-50 px-4 py-8 sm:px-6 lg:items-center lg:py-16">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8 relative z-10 -mt-16 lg:mt-0">
          <h2 className="text-2xl font-bold text-stone-900">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-stone-600">Log in to order this season&apos;s harvest.</p>
          {/* LoginForm reads ?callbackUrl, which is request data */}
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
