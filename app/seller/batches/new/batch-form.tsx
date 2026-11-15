"use client";

import { useActionState, useState } from "react";
import { MONTHS } from "@/lib/form";
import { DEFAULT_LISTING_DAYS, LISTING_DAYS, taka } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { createBatch, type BatchState } from "../actions";

type Option = { id: string; name: string };

const PICKED = [
  { value: "0", label: "Today" },
  { value: "1", label: "Yesterday" },
  { value: "2", label: "2 days ago" },
];

const pill = (on: boolean) =>
  `flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-sm font-semibold text-stone-900 ${
    on ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-white hover:border-stone-400"
  }`;

export function BatchForm({ orchards, varieties }: { orchards: Option[]; varieties: Option[] }) {
  // Controlled, because React 19 resets a form after each action and a failed save keeps its input.
  const [orchardId, setOrchardId] = useState(orchards[0].id);
  const [varietyId, setVarietyId] = useState(varieties[0]?.id ?? "new");
  const [varietyName, setVarietyName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [taste, setTaste] = useState("");
  const [bestUse, setBestUse] = useState("");
  const [picked, setPicked] = useState("0");
  const [totalKg, setTotalKg] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState(String(DEFAULT_LISTING_DAYS));
  const [state, action, pending] = useActionState<BatchState, FormData>(createBatch, undefined);

  const isNew = varietyId === "new";
  const worth = Number(totalKg) > 0 && Number(price) > 0 ? Number(totalKg) * Number(price) : 0;

  return (
    <form action={action} className={`${ui.card} space-y-5`}>
      {orchards.length === 1 ? (
        <div>
          <input type="hidden" name="orchardId" value={orchardId} />
          <p className={ui.label}>Orchard</p>
          <p className="mt-1 font-semibold text-stone-900">{orchards[0].name}</p>
        </div>
      ) : (
        <div>
          <label htmlFor="orchardId" className={ui.label}>
            Orchard
          </label>
          <select id="orchardId" name="orchardId" value={orchardId} onChange={(e) => setOrchardId(e.target.value)} className={ui.input}>
            {orchards.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor="varietyId" className={ui.label}>
            Variety
          </label>
          <select id="varietyId" name="varietyId" value={varietyId} onChange={(e) => setVarietyId(e.target.value)} className={ui.input}>
            {varieties.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
            <option value="new">+ Add a new variety</option>
          </select>
        </div>

        {isNew && (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-stone-700">
              Customers see this in the Mango Guide. If a variety with the same name is already listed, yours is added to it.
            </p>
            <div>
              <label htmlFor="varietyName" className={ui.label}>
                Name
              </label>
              <input
                id="varietyName"
                name="varietyName"
                required
                maxLength={40}
                placeholder="e.g. Harivanga"
                value={varietyName}
                onChange={(e) => setVarietyName(e.target.value)}
                className={ui.input}
              />
            </div>
            <fieldset>
              <legend className={ui.label}>
                Season <span className="font-normal text-stone-500">(optional)</span>
              </legend>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {[
                  { name: "seasonStart", label: "From", value: seasonStart, set: setSeasonStart },
                  { name: "seasonEnd", label: "To", value: seasonEnd, set: setSeasonEnd },
                ].map((m) => (
                  <select
                    key={m.name}
                    name={m.name}
                    aria-label={`Season ${m.label.toLowerCase()}`}
                    value={m.value}
                    onChange={(e) => m.set(e.target.value)}
                    className={ui.input}
                  >
                    <option value="">{m.label}: month</option>
                    {MONTHS.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="taste" className={ui.label}>
                Taste <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <input
                id="taste"
                name="taste"
                maxLength={120}
                placeholder="e.g. Sweet, fibreless, mild aroma"
                value={taste}
                onChange={(e) => setTaste(e.target.value)}
                className={ui.input}
              />
            </div>
            <div>
              <label htmlFor="bestUse" className={ui.label}>
                Best for <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <input
                id="bestUse"
                name="bestUse"
                maxLength={120}
                placeholder="e.g. Eating fresh, juice"
                value={bestUse}
                onChange={(e) => setBestUse(e.target.value)}
                className={ui.input}
              />
            </div>
          </div>
        )}
      </div>

      <fieldset>
        <legend className={ui.label}>When were they picked?</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {PICKED.map((p) => (
            <label key={p.value} className={pill(picked === p.value)}>
              <input type="radio" name="picked" value={p.value} checked={picked === p.value} onChange={() => setPicked(p.value)} className="sr-only" />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="totalKg" className={ui.label}>
            How many kg?
          </label>
          <input
            id="totalKg"
            name="totalKg"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            step={1}
            required
            placeholder="e.g. 200"
            value={totalKg}
            onChange={(e) => setTotalKg(e.target.value)}
            className={ui.input}
          />
        </div>
        <div>
          <label htmlFor="pricePerKg" className={ui.label}>
            Price per kg (৳)
          </label>
          <input
            id="pricePerKg"
            name="pricePerKg"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            step={1}
            required
            placeholder="e.g. 160"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={ui.input}
          />
        </div>
      </div>

      <fieldset>
        <legend className={ui.label}>Keep on sale for</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {LISTING_DAYS.map((d) => (
            <label key={d} className={pill(days === String(d))}>
              <input type="radio" name="days" value={d} checked={days === String(d)} onChange={() => setDays(String(d))} className="sr-only" />
              {d} days
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-stone-500">Counted from the picking day. After that, unsold kg stop showing to customers.</p>
      </fieldset>

      {worth > 0 && (
        <p className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-700">
          Worth <strong>{taka(worth)}</strong> if all {totalKg} kg sell.
        </p>
      )}

      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${ui.button} w-full`}>
        {pending ? "Listing…" : "List batch"}
      </button>
    </form>
  );
}
