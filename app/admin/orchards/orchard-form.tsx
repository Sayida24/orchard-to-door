"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/lib/ui";
import { saveOrchard } from "./actions";

type Orchard = { id: string; name: string; location: string; description: string | null; sellerId: string };
type Seller = { id: string; name: string; phone: string };

export function OrchardForm({ orchard, sellers }: { orchard?: Orchard; sellers: Seller[] }) {
  const [state, action] = useActionState(saveOrchard, undefined);
  const v = state?.values; // typed values after a failed save

  if (sellers.length === 0) {
    return (
      <div className={ui.card}>
        <p className="font-medium">No sellers yet.</p>
        <p className="mt-1 text-sm text-stone-600">
          Every orchard is run by a seller.{" "}
          <Link href="/admin/users" className={ui.link}>
            Make a user a seller
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className={`${ui.card} space-y-4`}>
      {orchard && <input type="hidden" name="id" value={orchard.id} />}
      <div>
        <label htmlFor="name" className={ui.label}>
          Orchard name
        </label>
        <input id="name" name="name" required defaultValue={v?.name ?? orchard?.name} className={ui.input} />
      </div>
      <div>
        <label htmlFor="location" className={ui.label}>
          Location
        </label>
        <input
          id="location"
          name="location"
          required
          placeholder="Upazila, District"
          defaultValue={v?.location ?? orchard?.location}
          className={ui.input}
        />
      </div>
      <div>
        <label htmlFor="sellerId" className={ui.label}>
          Seller
        </label>
        <select
          key={v?.sellerId ?? orchard?.sellerId ?? ""} // remount so a refilled value is applied
          id="sellerId"
          name="sellerId"
          required
          defaultValue={v?.sellerId ?? orchard?.sellerId ?? ""}
          className={ui.input}
        >
          <option value="" disabled>
            Choose a seller
          </option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.phone}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="description" className={ui.label}>
          Description <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Tree age, varieties grown, farming practice…"
          defaultValue={v?.description ?? orchard?.description ?? ""}
          className={ui.input}
        />
      </div>
      <p className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
        Orchard video and photos: uploads arrive with file storage in Phase 2.
      </p>
      {state?.error && (
        <p role="alert" className={ui.fieldError}>
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <SubmitButton>{orchard ? "Save changes" : "Create orchard"}</SubmitButton>
        <Link href="/admin/orchards" className={ui.buttonSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
