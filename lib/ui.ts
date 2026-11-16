// Shared Tailwind class strings so forms look the same everywhere.
// Colours come from the "Orchard Morning" tokens in app/globals.css.
export const ui = {
  page: "mx-auto w-full max-w-5xl px-4 py-6",
  card: "rounded-2xl border border-line bg-white p-5 shadow-sm",
  label: "block text-sm font-medium text-ink",
  input:
    "mt-1 block w-full rounded-xl border border-[#DCD4C3] bg-white px-3 py-3 text-base text-ink placeholder:text-muted focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20",
  fieldError: "mt-1 text-sm text-red-700",
  button:
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-mango px-5 py-3 text-base font-semibold text-ink hover:bg-mango-dark disabled:cursor-not-allowed disabled:opacity-60",
  buttonSecondary:
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-[#CFC7B5] hover:bg-cream",
  link: "font-medium text-leaf underline-offset-2 hover:underline",
};
