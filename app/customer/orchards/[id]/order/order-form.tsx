"use client";

import { useActionState, useState } from "react";
import { DELIVERY_AFTER_DAYS, mangoEstimate, taka, varietyColor } from "@/lib/shop";
import { placeOrder, type PlaceOrderState } from "./actions";

type Batch = { id: string; variety: string; pricePerKg: number; availableKg: number; picked: string };
type Area = { id: string; name: string; fee: number };

const PRESETS = [5, 10, 20, 40];
const field =
  "h-[52px] w-full rounded-[14px] border border-[#DCD4C3] bg-white px-3.5 text-base text-ink placeholder:text-muted focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20";
const label = "px-1 text-sm font-semibold text-ink";
const legend = "mb-3 px-1 font-display text-[21px] font-semibold text-ink";
// A whole card is the choice; the radio inside is visually hidden but keeps keyboard use.
const choice = (on: boolean) =>
  `flex cursor-pointer items-center gap-3 rounded-[20px] bg-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf has-[:focus-visible]:ring-offset-2 ${
    on ? "border-2 border-leaf bg-[#F2F7F0]" : "border border-line hover:border-[#CFC7B5]"
  }`;

export function OrderForm({
  orchardId,
  sellerFirst,
  batches,
  areas,
  days,
  contact,
  giftFee,
  approvalHours,
}: {
  orchardId: string;
  sellerFirst: string;
  batches: Batch[];
  areas: Area[];
  days: string[];
  contact: { name: string; phone: string };
  giftFee: number;
  approvalHours: number;
}) {
  const [state, action, pending] = useActionState<PlaceOrderState, FormData>(placeOrder, undefined);
  const [batchId, setBatchId] = useState(batches[0].id);
  const [kgInput, setKgInput] = useState("5");
  const [gift, setGift] = useState(false);
  const [areaId, setAreaId] = useState(areas.find((a) => a.name === "Mirpur")?.id ?? areas[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [day, setDay] = useState(days[0]);
  const [availability, setAvailability] = useState("");

  // Every input is controlled, so nothing is lost if the server sends back an error.
  const batch = batches.find((b) => b.id === batchId) ?? batches[0];
  const max = batch.availableKg;
  const parsed = parseInt(kgInput, 10);
  const kg = Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), max);
  const setKg = (n: number) => setKgInput(String(Math.min(Math.max(n, 1), max)));
  const area = areas.find((a) => a.id === areaId);
  const fruit = kg * batch.pricePerKg;
  const total = fruit + (gift ? giftFee : 0) + (area?.fee ?? 0);

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="orchardId" value={orchardId} />
      <input type="hidden" name="batchId" value={batch.id} />
      {/* The price the customer saw: if the seller changes it meanwhile, the order stops. */}
      <input type="hidden" name="price" value={batch.pricePerKg} />
      <input type="hidden" name="day" value={day} />

      <fieldset className="space-y-2.5">
        <legend className={legend}>Choose your mangoes</legend>
        {batches.map((b) => {
          const on = b.id === batch.id;
          return (
            <label key={b.id} className={`${choice(on)} px-3.5 py-3`}>
              <input
                type="radio"
                name="batchChoice"
                value={b.id}
                checked={on}
                onChange={() => {
                  setBatchId(b.id);
                  if (kg > b.availableKg) setKgInput(String(b.availableKg));
                }}
                className="sr-only"
              />
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mango-soft font-display text-lg font-bold text-mango-ink">
                {b.variety.charAt(0)}
                <span aria-hidden="true" className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: varietyColor(b.variety) }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{b.variety}</span>
                <span className="block text-[13px] text-muted">
                  {b.picked} · {b.availableKg} kg left
                </span>
              </span>
              <span className="font-display text-[19px] font-bold text-ink">
                {taka(b.pricePerKg)}
                <span className="font-sans text-xs font-medium text-muted">/kg</span>
              </span>
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? "bg-leaf text-white" : "border-2 border-[#CFC7B5]"}`}
              >
                {on && (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legend}>How many kg?</legend>
        <div className="flex flex-col items-center gap-3.5 rounded-3xl border border-line bg-white p-5">
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setKg(kg - 1)}
              disabled={kg <= 1}
              aria-label="Remove 1 kg"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-cream text-ink hover:border-[#CFC7B5] disabled:opacity-40"
            >
              <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>
            <div className="flex items-baseline justify-center gap-1.5">
              <label htmlFor="kg" className="sr-only">
                Kilograms
              </label>
              <input
                id="kg"
                name="kg"
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                step={1}
                required
                value={kgInput}
                onChange={(e) => setKgInput(e.target.value)}
                onBlur={() => setKg(kg || 1)}
                style={{ width: `${Math.max(kgInput.length, 1) + 1}ch` }} // as wide as the number, so "kg" sits next to it
                className="rounded-lg bg-transparent text-center font-display text-4xl font-bold leading-none text-ink [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-leaf/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-base font-semibold text-muted">kg</span>
            </div>
            <button
              type="button"
              onClick={() => setKg(kg + 1)}
              disabled={kg >= max}
              aria-label="Add 1 kg"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-leaf text-white hover:bg-leaf-dark disabled:opacity-40"
            >
              <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            </button>
          </div>
          <p className="text-sm text-muted">
            {kg > 0 ? `About ${mangoEstimate(kg)} mangoes · ` : ""}up to {max} kg available
          </p>
          {kg === max && <p className="text-sm font-semibold text-mango-ink">That&apos;s all the {batch.variety} left in this batch.</p>}
          <div className="grid w-full grid-cols-4 gap-2">
            {PRESETS.filter((p) => p <= max).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setKg(p)}
                aria-pressed={kg === p}
                className={`h-11 rounded-full text-sm font-semibold ${
                  kg === p ? "bg-leaf text-white" : "border border-line bg-white text-ink hover:border-[#CFC7B5]"
                }`}
              >
                {p} kg
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3.5 rounded-[20px] border border-line bg-white px-4 py-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-mango-soft text-mango-ink">
            <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M12 8v13" />
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 11 5 12 8c1-3 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" />
            </svg>
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-ink">Make it a gift box</span>
            <span className="block text-[13px] text-muted">Wrapped box with a card · +{taka(giftFee)}</span>
          </span>
          <input type="checkbox" name="gift" value="1" checked={gift} onChange={(e) => setGift(e.target.checked)} className="peer sr-only" />
          <span
            aria-hidden="true"
            className="relative h-8 w-[52px] shrink-0 rounded-full bg-[#CFC7B5] transition after:absolute after:left-[3px] after:top-[3px] after:h-[26px] after:w-[26px] after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-leaf peer-checked:after:translate-x-5"
          />
        </label>
      </fieldset>

      <fieldset className="space-y-3.5">
        <legend className={legend}>Where should we deliver?</legend>
        <p className="-mt-2 px-1 text-sm text-muted">Anywhere in Dhaka city. The delivery fee depends on your area.</p>
        <div className="space-y-1.5">
          <label htmlFor="address" className={label}>
            House, flat and road
          </label>
          <input
            id="address"
            name="address"
            required
            minLength={5}
            autoComplete="address-line1"
            placeholder="e.g. House 12, Flat 4B, Road 5"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={field}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="areaId" className={label}>
            Area in Dhaka
          </label>
          <select id="areaId" name="areaId" required value={areaId} onChange={(e) => setAreaId(e.target.value)} className={field}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · delivery {taka(a.fee)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="landmark" className={label}>
            Nearby landmark <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="landmark"
            name="landmark"
            placeholder="e.g. next to the school gate"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            className={field}
          />
        </div>
        <p className="flex h-11 items-center justify-between rounded-[14px] bg-white/70 px-4 text-sm">
          <span className="text-muted">City</span>
          <strong className="text-ink">Dhaka</strong>
        </p>
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className={legend}>When can you receive it?</legend>
        <p className="-mt-2 px-1 text-sm text-muted">
          Delivery takes 2–3 days: the seller approves your order first, then packs and sends it.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {days.map((d, i) => {
            const on = d === day;
            return (
              <label key={d} className={`${choice(on)} min-h-16 rounded-2xl px-4 py-3`}>
                <input type="radio" name="dayChoice" value={d} checked={on} onChange={() => setDay(d)} className="sr-only" />
                <span
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 rounded-full ${on ? "border-[6px] border-leaf bg-white" : "border-2 border-[#CFC7B5]"}`}
                />
                <span className="leading-tight">
                  <span className="block text-[15px] font-bold text-ink">{d}</span>
                  <span className="block text-xs text-muted">in {DELIVERY_AFTER_DAYS[i]} days</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="availability" className={label}>
            When are you available? <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="availability"
            name="availability"
            maxLength={60}
            placeholder="e.g. after 5 PM, or before 11 AM"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className={field}
          />
          <p className="px-1 text-xs text-muted">Leave it empty if any time that day works.</p>
        </div>
        <p className="flex items-center justify-between gap-3 rounded-[14px] bg-white/70 px-4 py-3 text-sm">
          <span className="text-muted">We&apos;ll call</span>
          <strong className="text-ink">
            {contact.name} · {contact.phone}
          </strong>
        </p>
      </fieldset>

      <section aria-label="Order total" className="space-y-2.5 rounded-3xl border border-line bg-white p-5 text-[15px] text-ink">
        <div className="flex justify-between gap-3">
          <span>
            {kg} kg {batch.variety} × {taka(batch.pricePerKg)}
          </span>
          <span>{taka(fruit)}</span>
        </div>
        {gift && (
          <div className="flex justify-between">
            <span>Gift box</span>
            <span>{taka(giftFee)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Delivery · {area?.name ?? "your area"}</span>
          <span>{taka(area?.fee ?? 0)}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-[#F1EBDD] pt-3">
          <span className="font-display text-[21px] font-semibold">Total</span>
          <span className="font-display text-3xl font-bold">{taka(total)}</span>
        </div>
        <p className="text-[13px] text-muted">
          Delivery on {day}
          {availability.trim() ? `, ${availability.trim()}` : ""}. Pay in cash when the box arrives.
        </p>
        <p className="flex gap-2.5 rounded-[14px] bg-mango-soft p-3 text-[13px] leading-snug text-[#4A2E00]">
          <svg aria-hidden="true" className="mt-px h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {sellerFirst} approves your order within {approvalHours} hours. Your {kg || ""} kg are held for you until then.
        </p>
      </section>

      {state?.error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 pb-5 pt-3 shadow-[0_-8px_24px_rgba(27,42,31,0.08)] backdrop-blur">
        <button
          type="submit"
          disabled={pending || kg < 1}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-mango text-[17px] font-bold text-ink hover:bg-mango-dark disabled:opacity-60"
        >
          {pending ? "Placing your order…" : `Place order · ${taka(total)}`}
        </button>
      </div>
    </form>
  );
}
