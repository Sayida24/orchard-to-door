"use client";

import { useActionState, useState } from "react";
import { ui } from "@/lib/ui";
import { updatePrice, updateStock, type BatchState } from "../actions";

function Result({ state }: { state: BatchState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
        {state.error}
      </p>
    );
  }
  return state?.ok ? (
    <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-900">
      {state.ok}
    </p>
  ) : null;
}

export function PriceForm({ batchId, price }: { batchId: string; price: number }) {
  const [value, setValue] = useState(String(price));
  const [state, action, pending] = useActionState<BatchState, FormData>(updatePrice, undefined);
  return (
    <form action={action} className={`${ui.card} space-y-2`}>
      <input type="hidden" name="batchId" value={batchId} />
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
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={ui.input}
      />
      <p className="text-xs text-stone-500">New orders pay this. Orders already placed keep their price.</p>
      <Result state={state} />
      <button type="submit" disabled={pending || Number(value) === price} className={ui.button}>
        {pending ? "Saving…" : "Save price"}
      </button>
    </form>
  );
}

export function StockForm({ batchId, availableKg }: { batchId: string; availableKg: number }) {
  const [value, setValue] = useState(String(availableKg));
  const [state, action, pending] = useActionState<BatchState, FormData>(updateStock, undefined);
  return (
    <form action={action} className={`${ui.card} space-y-2`}>
      <input type="hidden" name="batchId" value={batchId} />
      <label htmlFor="availableKg" className={ui.label}>
        Kg left to sell
      </label>
      <input
        id="availableKg"
        name="availableKg"
        type="number"
        inputMode="numeric"
        min={0}
        max={10000}
        step={1}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={ui.input}
      />
      <p className="text-xs text-stone-500">Lower it if some spoiled, raise it if you picked more. 0 means sold out.</p>
      <Result state={state} />
      <button type="submit" disabled={pending || Number(value) === availableKg} className={ui.button}>
        {pending ? "Saving…" : "Save kg"}
      </button>
    </form>
  );
}
