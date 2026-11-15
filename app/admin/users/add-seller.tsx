"use client";

import { useActionState, useState } from "react";
import { ui } from "@/lib/ui";
import { createSeller, type AddSellerState } from "./actions";

/** "+ Add seller": collapsed until needed. Each round gets a fresh form via `key`. */
export function AddSeller() {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${ui.button} px-4 py-2 text-sm`}>
        + Add seller
      </button>
    );
  }
  return <AddSellerForm key={round} onAnother={() => setRound((r) => r + 1)} onClose={() => setOpen(false)} />;
}

function AddSellerForm({ onAnother, onClose }: { onAnother: () => void; onClose: () => void }) {
  const [state, action, pending] = useActionState<AddSellerState, FormData>(createSeller, undefined);
  const [copied, setCopied] = useState(false);
  const v = state?.values; // typed values after an error

  if (state?.created) {
    const { name, phone, url } = state.created;
    const first = name.split(" ")[0];
    const message = `Hi ${first}, your Orchiva seller account is ready. Open this link to choose your password (it works once, within 24 hours), then log in with your phone number ${phone}: ${url}`;
    return (
      <div className={`${ui.card} space-y-3 border-green-300 bg-green-50`}>
        <p className="font-semibold text-green-900">
          Seller account created for {name} ({phone}).
        </p>
        <p className="text-sm text-green-900">
          Send {first} this one-time link. They open it, choose their own password, and log in with their phone number.
          It works once and expires in 24 hours. If it expires, use &ldquo;Reset link&rdquo; next to their name below.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            aria-label="Setup link"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-green-200 bg-white px-2 py-2 text-xs"
          />
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            }}
            className={ui.buttonSecondary}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/88${phone}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            Send on WhatsApp
          </a>
          <button type="button" onClick={onAnother} className={ui.buttonSecondary}>
            Add another seller
          </button>
          <button type="button" onClick={onClose} className={ui.buttonSecondary}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className={`${ui.card} space-y-4`}>
      <div>
        <p className="font-semibold">Add a seller</p>
        <p className="text-sm text-stone-600">
          For someone you&apos;ve agreed to sell with. They&apos;ll choose their own password with a link you send them.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="seller-name" className={ui.label}>
            Name
          </label>
          <input id="seller-name" name="name" required maxLength={60} autoComplete="off" defaultValue={v?.name} className={ui.input} />
        </div>
        <div>
          <label htmlFor="seller-phone" className={ui.label}>
            Mobile number
          </label>
          <input
            id="seller-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            placeholder="01XXXXXXXXX"
            autoComplete="off"
            defaultValue={v?.phone}
            className={ui.input}
          />
        </div>
        <div>
          <label htmlFor="seller-email" className={ui.label}>
            Email <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <input id="seller-email" name="email" type="email" autoComplete="off" defaultValue={v?.email} className={ui.input} />
        </div>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={ui.button}>
          {pending ? "Creating…" : "Create seller account"}
        </button>
        <button type="button" onClick={onClose} className={ui.buttonSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
