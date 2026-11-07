"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/lib/ui";
import { saveArea } from "./actions";

type Area = { id: string; name: string; fee: number };

const smallInput =
  "block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";

/** Name + fee inputs; used both to add a new area and to edit an existing one. */
export function AreaForm({ area }: { area?: Area }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: Parameters<typeof saveArea>[0], fd: FormData) => {
    const result = await saveArea(prev, fd);
    if (!area && !result?.error) formRef.current?.reset(); // clear the "add" form after success
    return result;
  }, undefined);

  const key = area?.id ?? "new";
  const v = state?.values; // typed values after a failed save
  return (
    <form ref={formRef} action={action} className="flex flex-1 flex-col gap-2">
      {area && <input type="hidden" name="id" value={area.id} />}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-[2_1_10rem]">
          <label htmlFor={`name-${key}`} className="sr-only">
            Area name
          </label>
          <input
            id={`name-${key}`}
            name="name"
            required
            placeholder="Area name, e.g. Banani"
            defaultValue={v?.name ?? area?.name}
            className={smallInput}
          />
        </div>
        <div className="flex-[1_1_6rem]">
          <label htmlFor={`fee-${key}`} className="sr-only">
            Delivery fee (taka)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-500">৳</span>
            <input
              id={`fee-${key}`}
              name="fee"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              placeholder="60"
              defaultValue={v?.fee ?? area?.fee}
              className={`${smallInput} pl-7`}
            />
          </div>
        </div>
        <SubmitButton
          pendingText={area ? "Saving…" : "Adding…"}
          className={area ? ui.buttonSecondary : `${ui.button} min-h-11 px-4 py-2 text-sm`}
        >
          {area ? "Save" : "Add area"}
        </SubmitButton>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
