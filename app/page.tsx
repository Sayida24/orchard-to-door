
import Link from "next/link";
import { ui } from "@/lib/ui";

const varieties = [
  {
    name: "Himsagar",
    description: "Known for its sweet flavour and smooth texture.",
    emoji: "🥭",
    season: "Popular variety",
  },
  {
    name: "Langra",
    description: "A much-loved mango with a distinctive taste.",
    emoji: "🥭",
    season: "Traditional favourite",
  },
  {
    name: "Fazli",
    description: "A large mango enjoyed during the summer season.",
    emoji: "🥭",
    season: "Summer favourite",
  },
];

const steps = [
  {
    number: "01",
    title: "Discover the harvest",
    description:
      "Explore mango varieties and learn about the harvest batches.",
    icon: "🌳",
  },
  {
    number: "02",
    title: "See your mango box",
    description:
      "Preview your packed box and learn about its quality checks.",
    icon: "📦",
  },
  {
    number: "03",
    title: "Verify your box",
    description:
      "Use your box QR code to check its journey and details.",
    icon: "🔎",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FFFDF7]">
      {/* Hero section */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2">
        <div>
          <span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
            🥭 FRESH FROM THE ORCHARD
          </span>

          <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-stone-900 sm:text-6xl">
            See your mangoes
            <span className="text-amber-600"> before you buy.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-8 text-stone-600 sm:text-lg">
            Discover mangoes straight from the orchard. Follow the
            harvest, explore your packed box and enjoy a more
            transparent shopping experience.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={ui.button}>
              Explore Orchiva →
            </Link>

            <Link href="/login" className={ui.buttonSecondary}>
              I have an account
            </Link>
          </div>

          <p className="mt-5 text-sm text-stone-500">
            Freshness begins at the orchard.
          </p>
        </div>

        {/* Decorative mango showcase */}
        <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FFE9A8] via-[#FFF3CC] to-[#E5F0C9] p-8">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/40" />
          <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-green-700/10" />

          <div className="relative text-center">
            <div className="text-8xl sm:text-9xl">🥭</div>
            <p className="mt-5 text-xl font-extrabold text-green-900">
              From orchard to your door
            </p>
            <p className="mt-2 text-sm text-green-800">
              Discover the journey of your mangoes.
            </p>
          </div>

          <div className="absolute left-5 top-5 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-green-900 shadow-sm">
            🌿 Orchard freshness
          </div>

          <div className="absolute bottom-5 right-5 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm">
            ✨ A better way to buy
          </div>
        </div>
      </section>

      {/* Variety section */}
      <section className="bg-[#F7F5EA] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-bold tracking-widest text-amber-700">
              EXPLORE MANGOES
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-stone-900 sm:text-4xl">
              Popular mango varieties
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-stone-600">
              Discover some of the mango varieties loved by mango
              enthusiasts.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {varieties.map((variety) => (
              <article
                key={variety.name}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-lime-100">
                  <span className="text-6xl">{variety.emoji}</span>
                </div>

                <p className="mt-5 text-xs font-bold uppercase tracking-wider text-amber-700">
                  {variety.season}
                </p>

                <h3 className="mt-2 text-xl font-bold text-stone-900">
                  {variety.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {variety.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <p className="text-sm font-bold tracking-widest text-amber-700">
            THE ORCHIVA EXPERIENCE
          </p>

          <h2 className="mt-3 text-3xl font-extrabold text-stone-900 sm:text-4xl">
            How Orchiva works
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-stone-600">
            A more transparent journey from the orchard to your home.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-2xl border border-stone-200 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl">{step.icon}</span>
                <span className="text-sm font-bold text-amber-600">
                  {step.number}
                </span>
              </div>

              <h3 className="mt-6 text-xl font-bold text-stone-900">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-stone-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="mx-4 mb-12 rounded-3xl bg-[#285B38] px-6 py-12 text-center text-white sm:mx-6 sm:px-10">
        <h2 className="text-3xl font-extrabold sm:text-4xl">
          Ready to discover Orchiva?
        </h2>

        <p className="mx-auto mt-4 max-w-xl leading-7 text-green-100">
          Create your account and discover a more transparent
          mango-shopping experience.
        </p>

        <Link
          href="/register"
          className="mt-7 inline-flex rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-900 transition hover:bg-amber-300"
        >
          Create your account →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
        © 2026 Orchiva. Freshness begins at the orchard.
      </footer>
    </main>
  );
}
