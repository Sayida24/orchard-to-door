import Link from "next/link";
import { ui } from "@/lib/ui";

// Placeholder landing page; batch browsing arrives in days 9–11.
export default function Home() {
  return (
    <main className={ui.page}>
      <section className="rounded-3xl bg-gradient-to-br from-amber-100 via-amber-50 to-lime-50 px-6 py-12 sm:px-10">
        <h1 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-stone-900 sm:text-5xl">
          See your mangoes before you buy.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-stone-700">
          Watch the harvest, then see your own packed box in 3D, checked by AI, before it ships.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className={ui.button}>
            Get started
          </Link>
          <Link href="/login" className={ui.buttonSecondary}>
            I have an account
          </Link>
        </div>
      </section>
    </main>
  );
}
