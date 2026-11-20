"use client";

import { useActionState, useState } from "react";
import { ui } from "@/lib/ui";
import { decideReport, type DecideState } from "./actions";

const OPTIONS = [
  { value: "REFUND", label: "Refund", tone: "border-green-600 bg-green-50" },
  { value: "REPLACEMENT", label: "Send new box", tone: "border-green-600 bg-green-50" },
  { value: "REJECT", label: "Not approved", tone: "border-stone-600 bg-stone-100" },
];

// The seller's decision on a problem report about one of their orders.
export function DecideForm({ id }: { id: string }) {
  // Controlled, because React 19 resets a form after each action and we keep input on errors.
  const [decision, setDecision] = useState("");
  const [note, setNote] = useState("");
  const [state, action, pending] = useActionState<DecideState, FormData>(decideReport, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-900">
        Decision saved. The customer has been notified.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3 border-t border-stone-100 pt-3">
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-stone-700">Decision</legend>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-2 text-center text-sm font-semibold text-stone-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lime-700 ${
                decision === o.value ? o.tone : "border-stone-200 hover:border-stone-400"
              }`}
            >
              <input
                type="radio"
                name="decision"
                value={o.value}
                checked={decision === o.value}
                onChange={() => setDecision(o.value)}
                required
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`note-${id}`} className={ui.label}>
          Note to the customer{" "}
          <span className="font-normal text-stone-500">{decision === "REJECT" ? "(required)" : "(optional)"}</span>
        </label>
        <textarea
          id={`note-${id}`}
          name="note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            decision === "REJECT"
              ? "e.g. The photos show the mangoes are only ripe, not spoiled."
              : "e.g. A fresh 3 kg box goes out tomorrow."
          }
          className={ui.input}
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending || !decision} className={ui.button}>
        {pending ? "Saving…" : "Save decision"}
      </button>
    </form>
  );
}
