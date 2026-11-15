"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/lib/ui";
import { saveOrchard } from "./actions";

type Orchard = { id: string; name: string; location: string; description: string | null };

// The admin's "fix the details" form. Sellers create orchards and own their photos.
export function OrchardForm({ orchard }: { orchard: Orchard }) {
  const [state, action] = useActionState(saveOrchard, undefined);
  const v = state?.values; // typed values after a failed save

  return (
    <form action={action} className={`${ui.card} space-y-4`}>
      <input type="hidden" name="id" value={orchard.id} />
      <div>
        <label htmlFor="name" className={ui.label}>
          Orchard name
        </label>
        <input id="name" name="name" required maxLength={60} defaultValue={v?.name ?? orchard.name} className={ui.input} />
      </div>
      <div>
        <label htmlFor="location" className={ui.label}>
          Location
        </label>
        <input
          id="location"
          name="location"
          required
          maxLength={80}
          placeholder="Upazila, District"
          defaultValue={v?.location ?? orchard.location}
          className={ui.input}
        />
      </div>
      <div>
        <label htmlFor="description" className={ui.label}>
          Description <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={600}
          defaultValue={v?.description ?? orchard.description ?? ""}
          className={ui.input}
        />
      </div>
      {state?.error && (
        <p role="alert" className={ui.fieldError}>
          {state.error}
        </p>
      )}
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
