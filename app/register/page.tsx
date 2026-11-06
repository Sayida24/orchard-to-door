
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create account · Orchiva",
  description: "Create your Orchiva account and discover fresh mangoes.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#FFF9EC] px-4 py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#EDE5D5] bg-white shadow-xl md:grid-cols-2">

        {/* Left branding section */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#285B38] p-7 text-white sm:p-10">

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🥭</span>
              <span className="text-2xl font-extrabold tracking-tight">
                Orchiva
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-[#F8D98B]">
              FRESH FROM THE ORCHARD
            </p>

            <h1 className="mt-12 max-w-sm text-4xl font-bold leading-tight sm:text-5xl">
              A sweeter way to discover mangoes.
            </h1>

            <p className="mt-5 max-w-sm text-sm leading-7 text-green-100">
              Discover fresh mangoes straight from the orchard.
              Follow their journey from harvest to your doorstep.
            </p>
          </div>

          <div className="relative z-10 mt-12 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-lg font-semibold text-[#F8D98B]">
              From orchard to your door.
            </p>
            <p className="mt-2 text-sm leading-6 text-green-50">
              Explore mango varieties, discover harvest batches
              and enjoy a more transparent shopping experience.
            </p>
          </div>

          {/* Decorative background circles */}
          <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#F2B544]/10" />
        </section>

        {/* Right registration section */}
        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8">
            <p className="text-sm font-semibold text-[#B77913]">
              JOIN ORCHIVA
            </p>

            <h2 className="mt-2 text-3xl font-bold text-stone-900">
              Create your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-stone-500">
              Enter your details below to get started.
            </p>
          </div>

          <RegisterForm />

          <p className="mt-8 border-t border-stone-100 pt-5 text-center text-xs leading-5 text-stone-400">
            By creating an account, you agree to use Orchiva
            responsibly and provide accurate information.
          </p>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-stone-400">
        © 2026 Orchiva. Freshness begins at the orchard.
      </p>
    </main>
  );
}
