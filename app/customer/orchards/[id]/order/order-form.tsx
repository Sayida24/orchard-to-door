"use client";

import { useActionState, useState } from "react";
import { mangoEstimate, taka } from "@/lib/shop";
import { placeOrder, type PlaceOrderState } from "./actions";

type Batch = { id: string; variety: string; pricePerKg: number; availableKg: number; picked: string };
type Area = { id: string; name: string; fee: number };

const PRESETS = [5, 10, 20, 40];
const field =
  "h-12 w-full rounded-2xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";
const label = "text-sm font-semibold text-stone-700";

export function OrderForm({
  orchardId,
  batches,
  areas,
  slots,
  contact,
  giftFee,
}: {
  orchardId: string;
  batches: Batch[];
  areas: Area[];
  slots: string[];
  contact: { name: string; phone: string };
  giftFee: number;
}) {
  const [state, action, pending] = useActionState<PlaceOrderState, FormData>(placeOrder, undefined);
  const [batchId, setBatchId] = useState(batches[0].id);
  const [kgInput, setKgInput] = useState("5");
  const [gift, setGift] = useState(false);
  const [areaId, setAreaId] = useState(areas.find((a) => a.name === "Mirpur")?.id ?? areas[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [slot, setSlot] = useState(slots[0]);

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
      <input type="hidden" name="slot" value={slot} />

      <fieldset className="space-y-3">
        <legend className="mb-1 text-base font-bold text-stone-900">1 · Choose mangoes</legend>
        <p className="-mt-2 text-sm text-stone-600">Price per kg, set by the seller.</p>
        {batches.map((b) => (
          <label
            key={b.id}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-white p-3 ${
              b.id === batch.id ? "border-amber-500" : "border-stone-200 hover:border-stone-400"
            }`}
          >
            <input
              type="radio"
              name="batchChoice"
              value={b.id}
              checked={b.id === batch.id}
              onChange={() => {
                setBatchId(b.id);
                if (kg > b.availableKg) setKgInput(String(b.availableKg));
              }}
              className="h-5 w-5 accent-amber-600"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-stone-900">{b.variety}</span>
              <span className="block text-sm text-stone-600">
                {b.picked} · {b.availableKg} kg left
              </span>
            </span>
            <span className="font-bold text-stone-900">
              {taka(b.pricePerKg)}
              <span className="text-xs font-medium text-stone-600">/kg</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-base font-bold text-stone-900">2 · How much?</legend>
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setKg(kg - 1)}
              disabled={kg <= 1}
              aria-label="Remove 1 kg"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-stone-300 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-40"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>
            <div className="flex flex-1 items-center justify-center gap-2">
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
                className="h-12 w-24 rounded-2xl border border-stone-300 bg-white text-center text-2xl font-extrabold text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <span className="text-lg font-bold text-stone-900">kg</span>
            </div>
            <button
              type="button"
              onClick={() => setKg(kg + 1)}
              disabled={kg >= max}
              aria-label="Add 1 kg"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-stone-300 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-40"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.filter((p) => p <= max).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setKg(p)}
                aria-pressed={kg === p}
                className={`h-11 rounded-xl border-2 text-sm font-bold text-stone-900 ${
                  kg === p ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-white hover:border-stone-400"
                }`}
              >
                {p} kg
              </button>
            ))}
          </div>
          <p className="text-sm text-stone-600">
            {kg > 0 ? `About ${mangoEstimate(kg)} mangoes · ` : ""}up to {max} kg available
          </p>
          {kg === max && <p className="text-sm font-semibold text-amber-800">That&apos;s all the {batch.variety} left in this batch.</p>}
          <div className="flex items-baseline justify-between border-t border-stone-100 pt-3">
            <span className="text-sm text-stone-700">
              {kg} kg × {taka(batch.pricePerKg)} per kg
            </span>
            <strong className="text-xl font-extrabold text-stone-900">{taka(fruit)}</strong>
          </div>
        </div>
        <label className="flex min-h-13 cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <span className="flex-1 font-semibold text-stone-900">
            Gift box <span className="font-medium text-stone-600">+{taka(giftFee)}</span>
          </span>
          <input
            type="checkbox"
            name="gift"
            value="1"
            checked={gift}
            onChange={(e) => setGift(e.target.checked)}
            className="h-6 w-6 accent-amber-600"
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-base font-bold text-stone-900">3 · Delivery address</legend>
        <p className="-mt-3 text-sm text-stone-600">We deliver anywhere in Dhaka city. The delivery fee depends on your area.</p>
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
            Area
          </label>
          <select id="areaId" name="areaId" required value={areaId} onChange={(e) => setAreaId(e.target.value)} className={field}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {taka(a.fee)} delivery
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="landmark" className={label}>
            Nearby landmark <span className="font-medium text-stone-500">(optional)</span>
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
        <div className="flex h-11 items-center justify-between rounded-2xl bg-stone-100 px-4 text-sm">
          <span className="text-stone-600">City</span>
          <strong className="text-stone-900">Dhaka</strong>
        </div>
        <div className="space-y-2">
          <span className={label}>Delivery time</span>
          {slots.map((s) => (
            <label
              key={s}
              className={`flex min-h-12 cursor-pointer items-center justify-between rounded-2xl border-2 bg-white px-4 font-semibold text-stone-900 ${
                s === slot ? "border-amber-500" : "border-stone-200 hover:border-stone-400"
              }`}
            >
              {s}
              <input
                type="radio"
                name="slotChoice"
                value={s}
                checked={s === slot}
                onChange={() => setSlot(s)}
                className="h-5 w-5 accent-amber-600"
              />
            </label>
          ))}
        </div>
        <div className="rounded-2xl bg-stone-100 px-4 py-3">
          <span className="block text-xs text-stone-600">Contact (from your account)</span>
          <span className="block font-semibold text-stone-900">
            {contact.name} · {contact.phone}
          </span>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-base font-bold text-stone-900">4 · Payment</legend>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-stone-900 bg-white p-4">
          <span className="flex-1">
            <span className="block font-bold text-stone-900">Cash on delivery</span>
            <span className="block text-sm text-stone-600">Pay when your mangoes arrive</span>
          </span>
          <svg aria-hidden="true" className="h-5 w-5 text-green-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
      </fieldset>

      <section aria-label="Order total" className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
        <div className="flex justify-between">
          <span>
            {batch.variety} · {kg} kg × {taka(batch.pricePerKg)}
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
          <span>Delivery to {area?.name ?? "your area"}</span>
          <span>{taka(area?.fee ?? 0)}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-stone-200 pt-2">
          <span className="text-base font-bold text-stone-900">Total</span>
          <span className="text-2xl font-extrabold text-stone-900">{taka(total)}</span>
        </div>
      </section>

      {state?.error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || kg < 1}
        className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-500 text-base font-extrabold text-stone-900 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "Placing your order…" : `Place order · ${taka(total)}`}
      </button>
    </form>
  );
}
