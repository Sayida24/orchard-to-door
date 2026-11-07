"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { MONTHS } from "@/lib/form";
import { ui } from "@/lib/ui";
import { saveVariety } from "./actions";

type Variety = {
  id: string;
  name: string;
  seasonStart: number | null;
  seasonEnd: number | null;
  taste: string | null;
  bestUse: string | null;
};

function MonthSelect({ name, label, value }: { name: string; label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex-1">
      <label htmlFor={name} className={ui.label}>
        {label}
      </label>
      {/* key: React only applies a select's defaultValue on mount, so remount when it changes */}
      <select key={String(value ?? "")} id={name} name={name} defaultValue={value ?? ""} className={ui.input}>
        <option value="">—</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

export function VarietyForm({ variety }: { variety?: Variety }) {
  const [state, action] = useActionState(saveVariety, undefined);
  const v = state?.values; // typed values after a failed save

  return (
    <form action={action} className={`${ui.card} space-y-4`}>
      {variety && <input type="hidden" name="id" value={variety.id} />}
      <div>
        <label htmlFor="name" className={ui.label}>
          Variety name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Himsagar"
          defaultValue={v?.name ?? variety?.name}
          className={ui.input}
        />
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-stone-700">Season</legend>
        <div className="flex gap-3">
          <MonthSelect name="seasonStart" label="From" value={v?.seasonStart ?? variety?.seasonStart} />
          <MonthSelect name="seasonEnd" label="To" value={v?.seasonEnd ?? variety?.seasonEnd} />
        </div>
      </fieldset>
      <div>
        <label htmlFor="taste" className={ui.label}>
          Taste
        </label>
        <input
          id="taste"
          name="taste"
          placeholder="e.g. Very sweet, fiberless, rich aroma"
          defaultValue={v?.taste ?? variety?.taste ?? ""}
          className={ui.input}
        />
      </div>
      <div>
        <label htmlFor="bestUse" className={ui.label}>
          Best use
        </label>
        <input
          id="bestUse"
          name="bestUse"
          placeholder="e.g. Eat fresh, juice"
          defaultValue={v?.bestUse ?? variety?.bestUse ?? ""}
          className={ui.input}
        />
      </div>
      {state?.error && (
        <p role="alert" className={ui.fieldError}>
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <SubmitButton>{variety ? "Save changes" : "Create variety"}</SubmitButton>
        <Link href="/admin/varieties" className={ui.buttonSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
