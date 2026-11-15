"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { CANCEL_REASONS } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { cancelOrder } from "./actions";

// Collapsed until the seller asks; they must pick a reason, which the customer sees.
export function CancelOrder({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const choice = CANCEL_REASONS.find((c) => c.reason === reason);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={ui.buttonSecondary}>
        Cancel order
      </button>
    );
  }

  return (
    <form action={cancelOrder} className="w-full space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor={`reason-${orderId}`} className="text-sm font-semibold text-red-900">
        Why are you cancelling?
      </label>
      <select
        id={`reason-${orderId}`}
        name="reason"
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={ui.input}
      >
        <option value="" disabled>
          Choose a reason
        </option>
        {CANCEL_REASONS.map((c) => (
          <option key={c.reason} value={c.reason}>
            {c.reason}
          </option>
        ))}
      </select>
      {choice && (
        <p className="text-xs text-red-900">
          The customer is told. {choice.restock ? "The kg go back on sale." : "The kg stay off sale."}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <SubmitButton
          disabled={!choice}
          pendingText="Cancelling…"
          className={`${ui.buttonSecondary} border-red-300 text-red-700 hover:bg-red-100 disabled:opacity-50`}
        >
          Cancel this order
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={ui.buttonSecondary}>
          Keep it
        </button>
      </div>
    </form>
  );
}
