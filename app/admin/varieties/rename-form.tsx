"use client";

import { useActionState, useState } from "react";
import { ui } from "@/lib/ui";
import { renameVariety, type RenameState } from "./actions";

export function RenameForm({ id, current }: { id: string; current: string }) {
  // Controlled, because React 19 resets a form after each action.
  const [name, setName] = useState(current);
  const [state, action, pending] = useActionState<RenameState, FormData>(renameVariety, undefined);
  const unchanged = name.trim().replace(/\s+/g, " ") === current;

  return (
    <div className={`${ui.card} space-y-3`}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <div>
          <label htmlFor="name" className={ui.label}>
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={ui.input}
          />
          <p className="mt-1 text-xs text-stone-500">
            Correct the spelling so customers see one clear name, e.g. &quot;Himsager&quot; to &quot;Himsagar&quot;.
          </p>
        </div>
        {state?.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {state.error}
          </p>
        )}
        {state?.ok && unchanged && (
          <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-900">
            Name saved.
          </p>
        )}
        <button type="submit" disabled={pending || unchanged} className={ui.button}>
          {pending ? "Saving…" : "Save name"}
        </button>
      </form>

      {state?.mergeInto && (
        <form action={action} className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="name" value={state.name ?? name} />
          <input type="hidden" name="merge" value="1" />
          <p className="text-sm text-stone-800">
            Is &quot;{current}&quot; the same mango as &quot;{state.mergeInto.name}&quot;? Merging moves its batches to{" "}
            {state.mergeInto.name} and removes &quot;{current}&quot;. This can&apos;t be undone.
          </p>
          <button type="submit" disabled={pending} className={ui.buttonSecondary}>
            Merge into {state.mergeInto.name}
          </button>
        </form>
      )}
    </div>
  );
}
