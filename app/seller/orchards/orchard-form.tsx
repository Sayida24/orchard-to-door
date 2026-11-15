"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PhotoPicker } from "@/components/photo-picker";
import { ui } from "@/lib/ui";
import { saveOrchard } from "./actions";

type Orchard = { id: string; name: string; location: string; description: string | null; photoUrls: string[] };

export function OrchardProfileForm({ orchard }: { orchard?: Orchard }) {
  const [state, action, pending] = useActionState(saveOrchard, undefined);
  // The shrunk photo is kept here, so it survives React resetting the form after an error.
  const [photo, setPhoto] = useState<Blob | null>(null);
  const v = state?.values; // typed values after a failed save

  const submit = (fd: FormData) => {
    if (photo) fd.set("photo", photo, "orchard.jpg");
    action(fd);
  };

  return (
    <form action={submit} className={`${ui.card} space-y-4`}>
      {orchard && <input type="hidden" name="id" value={orchard.id} />}
      <PhotoPicker
        id="photo"
        label="Orchard photo"
        hint={
          orchard
            ? "Choose a new photo to replace this one."
            : "Customers see this on your orchard's card. A wide photo of your trees or fruit works best."
        }
        currentUrl={orchard?.photoUrls[0]}
        required={!orchard}
        onChange={setPhoto}
      />
      <div>
        <label htmlFor="name" className={ui.label}>
          Orchard name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={60}
          placeholder="e.g. Shibganj Green Orchard"
          defaultValue={v?.name ?? orchard?.name}
          className={ui.input}
        />
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
          defaultValue={v?.location ?? orchard?.location}
          className={ui.input}
        />
      </div>
      <div>
        <label htmlFor="description" className={ui.label}>
          About your orchard <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={600}
          placeholder="How old are the trees, which varieties you grow, how you farm…"
          defaultValue={v?.description ?? orchard?.description ?? ""}
          className={ui.input}
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={ui.button}>
          {pending ? "Saving…" : orchard ? "Save changes" : "Create orchard"}
        </button>
        <Link href="/seller/orchards" className={ui.buttonSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
